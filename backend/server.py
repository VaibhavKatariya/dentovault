from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import uuid
import logging
import mimetypes
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import (
    FastAPI,
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    Request,
    status,
)
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", str(ROOT_DIR / "storage")))
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_HOURS = 12
ALLOWED_EXT = {".jpg", ".jpeg", ".png"}
ALLOWED_MIME = {"image/jpeg", "image/png", "image/jpg"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB per image

STORAGE_DIR.mkdir(parents=True, exist_ok=True)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="DENTOVAULT API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dentovault")


# ---------- Models ----------
def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.isoformat()


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)

class CreateUserRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32)


class PatientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    age: int = Field(ge=0, le=150)
    gender: str = Field(min_length=1, max_length=20)
    research_identifier: Optional[str] = None
    notes: Optional[str] = ""


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    research_identifier: Optional[str] = None
    notes: Optional[str] = None


# ---------- Auth helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, username: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "exp": utcnow() + timedelta(hours=ACCESS_TOKEN_TTL_HOURS),
        "iat": utcnow(),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required")
    return user


async def log_action(user_id: str, action: str, target: Optional[str] = None, meta: Optional[dict] = None):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "target": target,
        "meta": meta or {},
        "timestamp": iso(utcnow()),
    }
    await db.access_logs.insert_one(doc)


# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("username", unique=True)
    await db.patients.create_index("id", unique=True)
    await db.images.create_index("id", unique=True)
    await db.images.create_index("patient_id")
    await db.access_logs.create_index("timestamp")

    existing = await db.users.find_one({"username": ADMIN_USERNAME})
    if not existing:
        admin_doc = {
            "id": str(uuid.uuid4()),
            "username": ADMIN_USERNAME,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "role": "admin",
            "created_at": iso(utcnow()),
        }
        await db.users.insert_one(admin_doc)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ---------- Auth routes ----------
@api_router.get("/")
async def root():
    return {"app": "DENTOVAULT", "status": "ok"}


@api_router.post("/auth/login")
async def login(req: LoginRequest, request: Request):
    user = await db.users.find_one({"username": req.username.strip().lower()})
    if not user:
        # Allow original case fallback for backward compat
        user = await db.users.find_one({"username": req.username})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["id"], user["username"])
    await log_action(
        user["id"],
        "login",
        meta={"ip": request.client.host if request.client else "unknown"},
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user.get("role", "researcher"),
            "must_change_password": user.get("must_change_password", False),
        },
    }


@api_router.post("/auth/logout")
async def logout(user=Depends(get_current_user)):
    await log_action(user["id"], "logout")
    return {"message": "Logged out"}


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


@api_router.post("/auth/change-password")
async def change_password(req: ChangePasswordRequest, user=Depends(get_current_user)):
    full_user = await db.users.find_one({"id": user["id"]})
    if not verify_password(req.current_password, full_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": { "password_hash": hash_password(req.new_password), "must_change_password": False, }},
    )
    await log_action(user["id"], "change_password")
    return {"message": "Password changed"}


# ---------- User Management ----------
@api_router.get("/users")
async def list_users(admin=Depends(require_admin)):
    return await db.users.find({}, {"_id":0,"password_hash":0}).sort("username",1).to_list(100)

@api_router.post("/users", status_code=201)
async def create_user(payload: CreateUserRequest, admin=Depends(require_admin)):
    username = payload.username.strip().lower()
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=409, detail="Username already exists")
    user = {
        "id": str(uuid.uuid4()),
        "username": username,
        "password_hash": hash_password("hello123"),
        "role": "researcher",
        "must_change_password": True,
        "created_at": iso(utcnow()),
    }
    await db.users.insert_one(user)
    user.pop("_id", None)
    user.pop("password_hash", None)
    await log_action(admin["id"], "user_create", target=username)
    return user

@api_router.post("/users/{user_id}/reset-password")
async def reset_password(user_id: str, admin=Depends(require_admin)):
    user = await db.users.find_one({"id": user_id})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("role") == "admin":
        raise HTTPException(
            status_code=400,
            detail="Admin password cannot be reset."
        )

    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "password_hash": hash_password("hello123"),
                "must_change_password": True,
            }
        },
    )

    await log_action(
        admin["id"],
        "user_reset_password",
        target=user["username"],
    )

    return {
        "message": "Password reset successfully."
    }

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin=Depends(require_admin)):
    existing = await db.users.find_one({"id":user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    if existing["id"] == admin["id"]:
        raise HTTPException(
        status_code=400,
        detail="You cannot delete yourself."
    )
    
    await db.users.delete_one({"id":user_id})
    await log_action(admin["id"], "user_delete", target=existing["username"])
    return {"message":"User deleted"}


# ---------- Patient routes ----------
@api_router.get("/patients")
async def list_patients(
    q: Optional[str] = None,
    limit: int = 100,
    user=Depends(get_current_user),
):
    query = {}
    if q:
        query = {
            "$or": [
                {"patient_identifier": {"$regex": q, "$options": "i"}},
                {"name": {"$regex": q, "$options": "i"}},
                {"research_identifier": {"$regex": q, "$options": "i"}},
                {"notes": {"$regex": q, "$options": "i"}},
            ]
        }
    items = await db.patients.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    # Attach image counts
    for p in items:
        p["image_count"] = await db.images.count_documents({"patient_id": p["id"]})
    return items

@api_router.post("/patients", status_code=201)
async def create_patient(payload: PatientCreate, user=Depends(get_current_user)):
    pid = str(uuid.uuid4())

    while True:
        patient_identifier = f"P-{uuid.uuid4().hex[:6].upper()}"

        exists = await db.patients.find_one(
            {"patient_identifier": patient_identifier}
        )

        if not exists:
            break

    doc = {
        "id": pid,
        "patient_identifier": patient_identifier,
        "name": payload.name.strip(),
        "age": payload.age,
        "gender": payload.gender,
        "research_identifier": (payload.research_identifier or "").strip(),
        "notes": payload.notes or "",
        "created_at": iso(utcnow()),
        "created_by": user["username"],
        "updated_at": iso(utcnow()),
        "updated_by": user["username"],
    }
    pid = str(uuid.uuid4())
    patient_identifier = f"P-{uuid.uuid4().hex[:8].upper()}"
    doc = {
        "id": pid,
        "patient_identifier": patient_identifier,
        "name": payload.name.strip(),
        "age": payload.age,
        "gender": payload.gender,
        "research_identifier": (payload.research_identifier or "").strip(),
        "notes": payload.notes or "",
        "created_at": iso(utcnow()),
        "created_by": user["username"],
        "updated_at": iso(utcnow()),
        "updated_by": user["username"],
    }
    await db.patients.insert_one(doc)
    (STORAGE_DIR / pid).mkdir(parents=True, exist_ok=True)
    await log_action(user["id"], "patient_create", target=pid)
    doc["image_count"]=0
    doc.pop("_id", None)
    return doc


@api_router.get("/patients/{patient_id}")
async def get_patient(patient_id: str, user=Depends(get_current_user)):
    p = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    p["image_count"] = await db.images.count_documents({"patient_id": patient_id})
    return p


@api_router.put("/patients/{patient_id}")
async def update_patient(
    patient_id: str, payload: PatientUpdate, user=Depends(get_current_user)
):
    p = await db.patients.find_one({"id": patient_id})
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update:
        update["updated_at"] = iso(utcnow())
        update["updated_by"] = user["username"]

    await db.patients.update_one(
        {"id": patient_id},
        {"$set": update},
    )
    await log_action(user["id"], "patient_update", target=patient_id, meta=update)
    p2 = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    p2["image_count"] = await db.images.count_documents({"patient_id": patient_id})
    return p2


@api_router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, user=Depends(get_current_user)):
    p = await db.patients.find_one({"id": patient_id})
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    # Delete images on disk
    images = await db.images.find({"patient_id": patient_id}).to_list(1000)
    for img in images:
        try:
            Path(img["file_path"]).unlink(missing_ok=True)
        except Exception as e:
            logger.warning("Failed to delete file %s: %s", img.get("file_path"), e)
    # Remove patient folder if empty
    folder = STORAGE_DIR / patient_id
    if folder.exists():
        try:
            for f in folder.iterdir():
                f.unlink()
            folder.rmdir()
        except Exception as e:
            logger.warning("Failed to remove folder: %s", e)
    await db.images.delete_many({"patient_id": patient_id})
    await db.patients.delete_one({"id": patient_id})
    await log_action(user["id"], "patient_delete", target=patient_id)
    return {"message": "Patient deleted"}


# ---------- Image routes ----------
@api_router.get("/patients/{patient_id}/images")
async def list_patient_images(patient_id: str, user=Depends(get_current_user)):
    p = await db.patients.find_one({"id": patient_id})
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    images = (
        await db.images.find({"patient_id": patient_id}, {"_id": 0, "file_path": 0})
        .sort("uploaded_at", 1)
        .to_list(1000)
    )
    return images


@api_router.post("/images/upload", status_code=201)
async def upload_image(
    patient_id: str = Form(...),
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    p = await db.patients.find_one({"id": patient_id})
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")

    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")
    if file.content_type and file.content_type.lower() not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail=f"MIME type {file.content_type} not allowed")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 25MB)")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    img_id = str(uuid.uuid4())
    safe_name = f"{img_id}{ext}"
    patient_folder = STORAGE_DIR / patient_id
    patient_folder.mkdir(parents=True, exist_ok=True)
    file_path = patient_folder / safe_name
    file_path.write_bytes(content)

    doc = {
        "id": img_id,
        "patient_id": patient_id,
        "original_filename": filename,
        "filename": safe_name,
        "file_path": str(file_path),
        "size": len(content),
        "mime": file.content_type or mimetypes.guess_type(filename)[0] or "image/jpeg",
        "uploaded_by": user["username"],
        "uploaded_at": iso(utcnow()),
    }
    await db.images.insert_one(doc)
    await db.patients.update_one(
    {"id": patient_id},
    {
        "$set": {
            "updated_at": iso(utcnow()),
            "updated_by": user["username"],
        }
    },
)
    await log_action(user["id"], "image_upload", target=img_id, meta={"patient_id": patient_id})
    return {k: v for k, v in doc.items() if k != "file_path" and k != "_id"}


@api_router.get("/images/{image_id}")
async def get_image(image_id: str, user=Depends(get_current_user)):
    img = await db.images.find_one({"id": image_id})
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    fp = Path(img["file_path"])
    if not fp.exists():
        raise HTTPException(status_code=410, detail="File missing on disk")
    await log_action(user["id"], "image_view", target=image_id)
    return FileResponse(str(fp), media_type=img.get("mime", "image/jpeg"))


@api_router.get("/images/{image_id}/meta")
async def get_image_meta(image_id: str, user=Depends(get_current_user)):
    img = await db.images.find_one({"id": image_id}, {"_id": 0, "file_path": 0})
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    return img


@api_router.delete("/images/{image_id}")
async def delete_image(image_id: str, user=Depends(get_current_user)):
    img = await db.images.find_one({"id": image_id})
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    try:
        Path(img["file_path"]).unlink(missing_ok=True)
    except Exception as e:
        logger.warning("Failed to delete file: %s", e)
    await db.images.delete_one({"id": image_id})
    await log_action(user["id"], "image_delete", target=image_id)
    await db.patients.update_one(
    {"id": img["patient_id"]},
    {
        "$set": {
            "updated_at": iso(utcnow()),
            "updated_by": user["username"],
        }
    },
)
    return {"message": "Image deleted"}


# ---------- Search ----------
@api_router.get("/search")
async def search(q: str, user=Depends(get_current_user)):
    if not q:
        return {"patients": [], "images": []}
    patients = await db.patients.find(
        {
            "$or": [
                {"patient_identifier": {"$regex": q, "$options": "i"}},
                {"name": {"$regex": q, "$options": "i"}},
                {"research_identifier": {"$regex": q, "$options": "i"}},
                {"notes": {"$regex": q, "$options": "i"}},
            ]
        },
        {"_id": 0},
    ).limit(20).to_list(20)
    images = await db.images.find(
        {"original_filename": {"$regex": q, "$options": "i"}},
        {"_id": 0, "file_path": 0},
    ).limit(20).to_list(20)
    return {"patients": patients, "images": images}


# ---------- Audit logs / Stats ----------
@api_router.get("/audit-logs")
async def audit_logs(limit: int = 100, user=Depends(get_current_user)):
    logs = (
        await db.access_logs.find({}, {"_id": 0})
        .sort("timestamp", -1)
        .to_list(limit)
    )
    # Attach usernames
    user_ids = list({l["user_id"] for l in logs if l.get("user_id")})
    if user_ids:
        users = await db.users.find(
            {"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "username": 1}
        ).to_list(len(user_ids))
        umap = {u["id"]: u["username"] for u in users}
        for l in logs:
            l["username"] = umap.get(l.get("user_id"), "unknown")
    return logs


@api_router.get("/stats")
async def stats(user=Depends(get_current_user)):
    total_patients = await db.patients.count_documents({})
    total_images = await db.images.count_documents({})
    total_size = 0
    async for img in db.images.find({}, {"size": 1}):
        total_size += img.get("size", 0)
    recent_logs = (
        await db.access_logs.find({}, {"_id": 0})
        .sort("timestamp", -1)
        .to_list(5)
    )
    return {
        "total_patients": total_patients,
        "total_images": total_images,
        "total_storage_bytes": total_size,
        "recent_activity": recent_logs,
    }


# ---------- App wiring ----------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
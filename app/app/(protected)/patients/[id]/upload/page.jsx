"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UploadCloud, X, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const ALLOWED = ["image/jpeg", "image/jpg", "image/png"];

function fmtBytes(n) {
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function Upload() {
    const { id } = useParams();
    const router = useRouter();
    const inputRef = useRef(null);
    const [patient, setPatient] = useState(null);
    const [files, setFiles] = useState([]); // { file, status, error }
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    useEffect(() => {
        api.get(`/patients/${id}`).then((r) => setPatient(r.data)).catch(() => router.push("/patients"));
    }, [id, router]);

    const addFiles = (list) => {
        const next = Array.from(list).map((file) => {
            const ext = file.name.toLowerCase().split(".").pop();
            const okExt = ["jpg", "jpeg", "png"].includes(ext);
            const okMime = ALLOWED.includes(file.type);
            const ok = okExt && okMime;
            return { file, status: ok ? "pending" : "rejected", error: ok ? null : "Only JPG/PNG allowed" };
        });
        setFiles((f) => [...f, ...next]);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        addFiles(e.dataTransfer.files);
    };

    const removeFile = (i) => setFiles((f) => f.filter((_, idx) => idx !== i));

    const uploadAll = async () => {
        setUploading(true);
        const updated = [...files];
        for (let i = 0; i < updated.length; i++) {
            if (updated[i].status !== "pending") continue;
            updated[i] = { ...updated[i], status: "uploading" };
            setFiles([...updated]);
            try {
                const fd = new FormData();
                fd.append("patient_id", id);
                fd.append("file", updated[i].file);
                await api.post("/images/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
                updated[i] = { ...updated[i], status: "done" };
            } catch (e) {
                updated[i] = {
                    ...updated[i],
                    status: "error",
                    error: formatApiError(e.response?.data?.detail) || "Upload failed",
                };
            }
            setFiles([...updated]);
        }
        setUploading(false);
        const successCount = updated.filter((f) => f.status === "done").length;
        if (successCount > 0) toast.success(`${successCount} image(s) uploaded`);
    };

    const hasPending = files.some((f) => f.status === "pending");

    return (
        <div className="p-6 sm:p-10 max-w-4xl">
            <Link href={`/patients/${id}`} className="inline-flex items-center gap-2 label-mono mb-6 hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> back to patient
            </Link>

            <div className="mb-8">
                <div className="label-mono mb-2">image upload</div>
                <h1 className="font-display text-3xl sm:text-4xl tracking-tight font-light">
                    Upload images
                </h1>
                {patient && (
                    <p className="text-sm text-muted-foreground mt-1 font-mono">
                        for {patient.patient_identifier}
                    </p>
                )}
            </div>

            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                data-testid="dropzone"
                className={`border border-dashed transition-colors cursor-pointer p-12 text-center ${dragOver ? "border-foreground bg-accent" : "border-border hover:border-foreground/60"
                    }`}
            >
                <UploadCloud className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <div className="font-display text-lg mb-1">Drop images here or click to browse</div>
                <div className="label-mono">JPG · PNG · max 25 MB each</div>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/jpg"
                    className="hidden"
                    data-testid="file-input"
                    onChange={(e) => addFiles(e.target.files)}
                />
            </div>

            {files.length > 0 && (
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="label-mono">queue · {files.length} file(s)</div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setFiles([])} disabled={uploading}>
                                Clear
                            </Button>
                            <Button onClick={uploadAll} disabled={uploading || !hasPending} data-testid="upload-all-button">
                                {uploading ? "Uploading…" : `Upload ${files.filter((f) => f.status === "pending").length} file(s)`}
                            </Button>
                        </div>
                    </div>
                    <div className="border border-border">
                        {files.map((f, i) => (
                            <div
                                key={i}
                                className={`flex items-center justify-between px-4 py-3 ${i !== 0 ? "border-t border-border" : ""}`}
                                data-testid={`file-row-${i}`}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {f.status === "done" && <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />}
                                    {f.status === "error" && <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
                                    {f.status === "rejected" && <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
                                    {f.status === "pending" && <div className="h-4 w-4 rounded-full border border-border shrink-0" />}
                                    {f.status === "uploading" && <div className="h-4 w-4 rounded-full border-2 border-foreground border-t-transparent animate-spin shrink-0" />}
                                    <div className="min-w-0 flex-1">
                                        <div className="font-mono text-sm truncate">{f.file.name}</div>
                                        <div className="label-mono text-[10px]">
                                            {fmtBytes(f.file.size)}
                                            {f.error && <span className="text-destructive ml-2">{f.error}</span>}
                                        </div>
                                    </div>
                                </div>
                                {(f.status === "pending" || f.status === "rejected") && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFile(i)}>
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>

                    {files.some((f) => f.status === "done") && (
                        <div className="mt-4 flex justify-end">
                            <Link href={`/patients/${id}`}>
                                <Button variant="outline" data-testid="done-uploading-button">View patient</Button>
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
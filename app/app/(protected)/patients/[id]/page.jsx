"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, fetchImageBlob, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Trash2, Upload as UploadIcon, X, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { toast } from "sonner";

function fmtBytes(n) {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function Thumbnail({ image, onClick }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let active = true;
    fetchImageBlob(image.id).then((u) => { if (active) setUrl(u); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image.id]);
  return (
    <button
      onClick={onClick}
      data-testid={`thumb-${image.id}`}
      className="group relative aspect-square overflow-hidden border border-border hover:border-foreground transition-colors bg-muted"
    >
      {url ? (
        <img src={url} alt={image.original_filename} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center label-mono">loading…</div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="font-mono text-[10px] text-white truncate">{image.original_filename}</div>
      </div>
    </button>
  );
}

export default function PatientDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState(null);
  const [images, setImages] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ patient_identifier: "", research_identifier: "", notes: "" });
  const [viewerIdx, setViewerIdx] = useState(null);

  const load = useCallback(async () => {
    const [p, imgs] = await Promise.all([
      api.get(`/patients/${id}`),
      api.get(`/patients/${id}/images`),
    ]);
    setPatient(p.data);
    setImages(imgs.data);
    setForm({
      patient_identifier: p.data.patient_identifier,
      research_identifier: p.data.research_identifier || "",
      notes: p.data.notes || "",
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      await api.put(`/patients/${id}`, form);
      toast.success("Patient updated");
      setEditing(false);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const deletePatient = async () => {
    try {
      await api.delete(`/patients/${id}`);
      toast.success("Patient deleted");
      router.push("/patients");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const deleteImage = async (imgId) => {
    try {
      await api.delete(`/images/${imgId}`);
      toast.success("Image deleted");
      setViewerIdx(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  if (!patient) {
    return <div className="p-10 label-mono">loading…</div>;
  }

  const current = viewerIdx !== null ? images[viewerIdx] : null;

  return (
    <div className="p-6 sm:p-10 max-w-7xl">
      <Link href="/patients" className="inline-flex items-center gap-2 label-mono mb-6 hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> patients
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="label-mono mb-2">patient · {patient.id.slice(0, 8)}</div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight font-light" data-testid="patient-detail-heading">
            {patient.patient_identifier}
          </h1>
          {patient.research_identifier && (
            <div className="font-mono text-sm text-muted-foreground mt-1">{patient.research_identifier}</div>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/patients/${id}/upload`}>
            <Button data-testid="upload-images-button" className="gap-2">
              <UploadIcon className="h-4 w-4" /> Upload Images
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  data-testid="delete-patient-button"
                />
              }
            >
              <Trash2 className="h-4 w-4" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete patient?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the patient record and all {images.length} associated image(s) from disk. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deletePatient} data-testid="confirm-delete-patient">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="label-mono">record details</div>
            {!editing ? (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} data-testid="edit-patient-button">
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); load(); }}>Cancel</Button>
                <Button size="sm" onClick={save} data-testid="save-patient-button" className="gap-1.5">
                  <Save className="h-3.5 w-3.5" /> Save
                </Button>
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="label-mono">Patient ID</Label>
              {editing ? (
                <Input
                  className="mt-1 font-mono"
                  value={form.patient_identifier}
                  onChange={(e) => setForm({ ...form, patient_identifier: e.target.value })}
                />
              ) : (
                <div className="mt-1 font-mono text-sm">{patient.patient_identifier}</div>
              )}
            </div>
            <div>
              <Label className="label-mono">Research ID</Label>
              {editing ? (
                <Input
                  className="mt-1 font-mono"
                  value={form.research_identifier}
                  onChange={(e) => setForm({ ...form, research_identifier: e.target.value })}
                />
              ) : (
                <div className="mt-1 font-mono text-sm">{patient.research_identifier || "—"}</div>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label className="label-mono">Notes</Label>
              {editing ? (
                <Textarea
                  className="mt-1"
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              ) : (
                <div className="mt-1 text-sm whitespace-pre-wrap">{patient.notes || "—"}</div>
              )}
            </div>
          </div>
        </div>

        <div className="border border-border p-6 space-y-4">
          <div className="label-mono">summary</div>
          <div>
            <div className="label-mono text-[10px] mb-1">Created</div>
            <div className="font-mono text-sm">{new Date(patient.created_at).toLocaleString()}</div>
          </div>
          <div>
            <div className="label-mono text-[10px] mb-1">Image Count</div>
            <div className="font-display text-3xl font-light">{images.length}</div>
          </div>
          <div>
            <div className="label-mono text-[10px] mb-1">Storage UUID</div>
            <div className="font-mono text-[11px] text-muted-foreground break-all">{patient.id}</div>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="label-mono mb-1">image gallery</div>
          <h2 className="font-display text-xl font-medium tracking-tight">
            {images.length} {images.length === 1 ? "image" : "images"}
          </h2>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="border border-border p-12 text-center">
          <div className="label-mono mb-2">no images uploaded</div>
          <p className="text-sm text-muted-foreground mb-4">Upload dental images (JPG, PNG) for this patient.</p>
          <Link href={`/patients/${id}/upload`}>
            <Button className="gap-2"><UploadIcon className="h-4 w-4" /> Upload now</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="image-grid">
          {images.map((img, i) => (
            <Thumbnail key={img.id} image={img} onClick={() => setViewerIdx(i)} />
          ))}
        </div>
      )}

      {/* 3-pane image viewer */}
      <Dialog open={viewerIdx !== null} onOpenChange={(o) => !o && setViewerIdx(null)}>
        <DialogContent className="max-w-6xl w-[95vw] h-[85vh] p-0 overflow-hidden grid grid-cols-1 md:grid-cols-[120px_1fr_260px]">
          {current && (
            <>
              {/* Left: filmstrip */}
              <div className="hidden md:block border-r border-border overflow-y-auto p-2 space-y-2">
                {images.map((img, i) => (
                  <FilmstripThumb
                    key={img.id}
                    image={img}
                    active={i === viewerIdx}
                    onClick={() => setViewerIdx(i)}
                  />
                ))}
              </div>
              {/* Center */}
              <ViewerCenter
                image={current}
                onPrev={() => setViewerIdx((viewerIdx - 1 + images.length) % images.length)}
                onNext={() => setViewerIdx((viewerIdx + 1) % images.length)}
                onClose={() => setViewerIdx(null)}
              />
              {/* Right: metadata */}
              <div className="hidden md:flex border-l border-border p-5 flex-col">
                <div className="label-mono mb-4">image metadata</div>
                <div className="space-y-4 text-sm flex-1 overflow-y-auto">
                  <div>
                    <div className="label-mono text-[10px] mb-1">Filename</div>
                    <div className="font-mono text-xs break-all">{current.original_filename}</div>
                  </div>
                  <div>
                    <div className="label-mono text-[10px] mb-1">Image ID</div>
                    <div className="font-mono text-[11px] text-muted-foreground break-all">{current.id}</div>
                  </div>
                  <div>
                    <div className="label-mono text-[10px] mb-1">Size</div>
                    <div className="font-mono text-xs">{fmtBytes(current.size)}</div>
                  </div>
                  <div>
                    <div className="label-mono text-[10px] mb-1">MIME</div>
                    <div className="font-mono text-xs">{current.mime}</div>
                  </div>
                  <div>
                    <div className="label-mono text-[10px] mb-1">Uploaded</div>
                    <div className="font-mono text-xs">{new Date(current.uploaded_at).toLocaleString()}</div>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 mt-4 w-full"
                        data-testid="delete-image-button"
                      />
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete image
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this image?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The file will be permanently removed from disk.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteImage(current.id)} data-testid="confirm-delete-image">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilmstripThumb({ image, active, onClick }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let m = true;
    fetchImageBlob(image.id).then((u) => { if (m) setUrl(u); });
    return () => { m = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image.id]);
  return (
    <button
      onClick={onClick}
      className={`block w-full aspect-square border ${active ? "border-foreground" : "border-border"} overflow-hidden`}
    >
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : null}
    </button>
  );
}

function ViewerCenter({ image, onPrev, onNext, onClose }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let m = true;
    fetchImageBlob(image.id).then((u) => { if (m) setUrl(u); });
    return () => { m = false; };
  }, [image.id]);
  return (
    <div className="relative bg-black/95 flex items-center justify-center">
      <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-3 right-3 z-10 text-white hover:bg-white/10" data-testid="viewer-close-button">
        <X className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onPrev} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10" data-testid="viewer-prev">
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onNext} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10" data-testid="viewer-next">
        <ChevronRight className="h-6 w-6" />
      </Button>
      {url ? (
        <img src={url} alt={image.original_filename} className="max-h-full max-w-full object-contain" data-testid="viewer-image" />
      ) : (
        <div className="text-white/60 label-mono">loading…</div>
      )}
    </div>
  );
}
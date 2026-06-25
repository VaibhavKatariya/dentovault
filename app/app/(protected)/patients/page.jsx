"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Search, ChevronRight, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

export default function PatientList() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const [form, setForm] = useState({
        name: "",
        age: "",
        gender: "Male",
        research_identifier: "",
        notes: "",
    });
    const [submitting, setSubmitting] = useState(false);

    const load = async (query = "") => {
        setLoading(true);
        try {
            const { data } = await api.get("/patients", { params: query ? { q: query } : {} });
            setPatients(data);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        const t = setTimeout(() => load(q.trim()), 250);
        return () => clearTimeout(t);
    }, [q]);

    const createPatient = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { data } = await api.post("/patients", {
                ...form,
                age: Number(form.age),
            });

            toast.success("Patient created");
            setOpen(false);
            setForm({
                name: "",
                age: "",
                gender: "Male",
                research_identifier: "",
                notes: "",
            });

            router.push(`/patients/${data.id}`);
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        } finally { setSubmitting(false); }
    };

    return (
        <div className="p-6 sm:p-10 max-w-7xl">
            <div className="flex items-end justify-between mb-8 gap-4">
                <div>
                    <div className="label-mono mb-2">research subjects</div>
                    <h1 className="font-display text-4xl sm:text-5xl tracking-tight font-light">Patients</h1>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <Button
                        data-testid="new-patient-button"
                        className="gap-2"
                        onClick={() => setOpen(true)}
                    >
                        <Plus className="h-4 w-4" />
                        New Patient
                    </Button>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-display text-2xl font-light">New patient</DialogTitle>
                            <DialogDescription className="label-mono">create research subject record</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={createPatient} className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label htmlFor="pid" className="label-mono">Patient Name *</Label>
                                <Input
                                    id="pid"
                                    value={form.name}
                                    onChange={(e)=>setForm({...form,name:e.target.value})}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="age" className="label-mono">Age *</Label>
                                <Input
                                    id="age"
                                    type="number"
                                    min={0}
                                    value={form.age}
                                    onChange={(e)=>setForm({...form,age:e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="label-mono">Gender *</Label>
                                <select
                                    className="w-full border rounded-md px-3 py-2 bg-background"
                                    value={form.gender}
                                    onChange={(e)=>setForm({...form,gender:e.target.value})}
                                >
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rid" className="label-mono">Research Identifier</Label>
                                <Input
                                    id="rid"
                                    data-testid="research-id-input"
                                    value={form.research_identifier}
                                    onChange={(e) => setForm({ ...form, research_identifier: e.target.value })}
                                    placeholder="STUDY-A-001"
                                    className="font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes" className="label-mono">Notes</Label>
                                <Textarea
                                    id="notes"
                                    data-testid="patient-notes-input"
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    rows={4}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={submitting} data-testid="submit-new-patient-button">
                                    {submitting ? "Creating…" : "Next →"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    data-testid="patient-search-input"
                    placeholder="Search by patient name, ID, research code or notes…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="pl-9 h-11 max-w-md"
                />
            </div>

            <div className="border border-border">
                <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border bg-muted/40">
                    <div className="col-span-3 label-mono">Patient</div>
                    <div className="col-span-3 label-mono hidden sm:block">Research</div>
                    <div className="col-span-3 label-mono hidden md:block">Created</div>
                    <div className="col-span-2 label-mono">Images</div>
                    <div className="col-span-1"></div>
                </div>
                {loading ? (
                    <div className="p-8 text-center label-mono">loading…</div>
                ) : patients.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="label-mono mb-2">no patients yet</div>
                        <p className="text-sm text-muted-foreground">
                            Create your first patient record to start uploading dental images.
                        </p>
                    </div>
                ) : (
                    patients.map((p) => (
                        <Link
                            key={p.id}
                            href={`/patients/${p.id}`}
                            data-testid={`patient-row-${p.patient_identifier}`}
                            className="grid grid-cols-12 gap-4 px-4 py-4 border-t border-border hover:bg-accent/50 transition-colors items-center"
                        >
                            <div className="col-span-3">
                                <div className="font-medium">{p.name}</div>
                                <div className="font-mono text-xs text-muted-foreground">{p.patient_identifier}</div>
                            </div>
                            <div className="col-span-3 font-mono text-xs text-muted-foreground hidden sm:block">
                                {p.research_identifier || "—"}
                            </div>
                            <div className="col-span-3 label-mono hidden md:block">{fmtDate(p.created_at)}</div>
                            <div className="col-span-2 flex items-center gap-2 text-sm">
                                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-mono">{p.image_count}</span>
                            </div>
                            <div className="col-span-1 flex justify-end">
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
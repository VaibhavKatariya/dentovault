import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const ACTION_LABELS = {
  login: "Login",
  logout: "Logout",
  change_password: "Password changed",
  patient_create: "Patient created",
  patient_update: "Patient updated",
  patient_delete: "Patient deleted",
  image_upload: "Image uploaded",
  image_view: "Image viewed",
  image_delete: "Image deleted",
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/audit-logs", { params: { limit: 200 } })
      .then((r) => setLogs(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 sm:p-10 max-w-7xl">
      <div className="mb-10">
        <div className="label-mono mb-2">activity</div>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight font-light">Audit Logs</h1>
      </div>

      <div className="border border-border">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border bg-muted/40">
          <div className="col-span-3 label-mono">Timestamp</div>
          <div className="col-span-2 label-mono">User</div>
          <div className="col-span-3 label-mono">Action</div>
          <div className="col-span-4 label-mono">Target / Meta</div>
        </div>
        {loading ? (
          <div className="p-8 text-center label-mono">loading…</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center label-mono">no activity</div>
        ) : (
          logs.map((l, i) => (
            <div
              key={l.id || i}
              className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-border items-center"
              data-testid={`audit-row-${i}`}
            >
              <div className="col-span-3 font-mono text-[11px] text-muted-foreground">
                {new Date(l.timestamp).toLocaleString()}
              </div>
              <div className="col-span-2 font-mono text-xs">{l.username || "—"}</div>
              <div className="col-span-3 text-sm">{ACTION_LABELS[l.action] || l.action}</div>
              <div className="col-span-4 font-mono text-[11px] text-muted-foreground truncate">
                {l.target || (l.meta && Object.keys(l.meta).length ? JSON.stringify(l.meta) : "—")}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
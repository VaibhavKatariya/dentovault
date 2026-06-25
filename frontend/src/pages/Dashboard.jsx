import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Users, Image as ImageIcon, HardDrive, Activity, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function fmtBytes(n) {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function fmtTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const cards = [
    { label: "Patients", value: stats?.total_patients ?? "—", icon: Users, testid: "stat-patients" },
    { label: "Images", value: stats?.total_images ?? "—", icon: ImageIcon, testid: "stat-images" },
    { label: "Storage Used", value: stats ? fmtBytes(stats.total_storage_bytes) : "—", icon: HardDrive, testid: "stat-storage" },
    { label: "Status", value: "Online", icon: Activity, testid: "stat-status" },
  ];

  return (
    <div className="p-6 sm:p-10 max-w-7xl">
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="label-mono mb-2">overview</div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight font-light">Dashboard</h1>
        </div>
        <Link to="/patients">
          <Button variant="outline" size="sm" data-testid="goto-patients-button" className="gap-2">
            All Patients <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border mb-12">
        {cards.map((c) => (
          <div key={c.label} data-testid={c.testid} className="bg-background p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="label-mono">{c.label}</span>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-light tracking-tight">{c.value}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="label-mono mb-1">recent activity</div>
            <h2 className="font-display text-xl font-medium tracking-tight">Audit trail</h2>
          </div>
          <Link to="/audit">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View all <ArrowUpRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        <div className="border border-border">
          {(stats?.recent_activity || []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No activity yet.</div>
          ) : (
            <div>
              {(stats?.recent_activity || []).map((log, i) => (
                <div
                  key={log.id || i}
                  className={`flex items-center justify-between px-4 py-3 ${i !== 0 ? "border-t border-border" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="label-mono text-[10px]">{fmtTime(log.timestamp)}</span>
                    <span className="font-mono text-xs">{log.action}</span>
                  </div>
                  {log.target && (
                    <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[200px]">
                      {log.target}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
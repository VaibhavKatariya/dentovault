import { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) {
      toast.error("New passwords don't match");
      return;
    }
    if (form.new_password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/change-password", {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      toast.success("Password updated");
      setForm({ current_password: "", new_password: "", confirm: "" });
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setSubmitting(false); }
  };

  return (
    <div className="p-6 sm:p-10 max-w-3xl">
      <div className="mb-10">
        <div className="label-mono mb-2">account</div>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight font-light">Settings</h1>
      </div>

      <div className="border border-border p-6 mb-6">
        <div className="label-mono mb-4">profile</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="label-mono">Username</Label>
            <div className="mt-1 font-mono text-sm">{user?.username}</div>
          </div>
          <div>
            <Label className="label-mono">Role</Label>
            <div className="mt-1 font-mono text-sm">{user?.role}</div>
          </div>
          <div className="sm:col-span-2">
            <Label className="label-mono">User ID</Label>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground break-all">{user?.id}</div>
          </div>
        </div>
      </div>

      <div className="border border-border p-6">
        <div className="label-mono mb-4">change password</div>
        <form onSubmit={submit} className="space-y-4 max-w-md">
          <div>
            <Label htmlFor="cp" className="label-mono">Current password</Label>
            <Input
              id="cp"
              data-testid="current-password-input"
              type="password"
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
              className="mt-1 font-mono"
              required
            />
          </div>
          <div>
            <Label htmlFor="np" className="label-mono">New password</Label>
            <Input
              id="np"
              data-testid="new-password-input"
              type="password"
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
              className="mt-1 font-mono"
              required
              minLength={6}
            />
          </div>
          <div>
            <Label htmlFor="cf" className="label-mono">Confirm new password</Label>
            <Input
              id="cf"
              data-testid="confirm-password-input"
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="mt-1 font-mono"
              required
            />
          </div>
          <Button type="submit" disabled={submitting} data-testid="change-password-button">
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
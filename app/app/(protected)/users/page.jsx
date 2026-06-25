"use client";

import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    username: "",
  });

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createUser(e) {
    e.preventDefault();

    try {
      await api.post("/users", {
        username: form.username,
      });

      toast.success("User created");

      setForm({
        username: "",
      });

      setOpen(false);

      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  }

  async function deleteUser(id) {
    if (!confirm("Delete this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success("User deleted");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  }

  async function resetPassword(id, username) {
    if (
      !confirm(
        `Reset ${username}'s password to hello123?`
      )
    ) {
      return;
    }

    try {
      await api.post(`/users/${id}/reset-password`);

      toast.success(
        "Password reset to hello123"
      );

      await load();
    } catch (e) {
      toast.error(
        formatApiError(e.response?.data?.detail)
      );
    }
  }

  return (
    <div className="p-6 sm:p-10 max-w-7xl">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="label-mono mb-2">administration</div>
          <h1 className="font-display text-4xl font-light">Users</h1>
        </div>

        <Button onClick={() => setOpen(true)}>
          + Create User
        </Button>
      </div>

      <div className="border border-border">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border bg-muted/40">
          <div className="col-span-4 label-mono">
            Username
          </div>

          <div className="col-span-4 label-mono">
            Status
          </div>

          <div className="col-span-4 label-mono text-right">
            Actions
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : (
          users.map(user => (
            <div
              key={user.id}
              className="grid grid-cols-12 gap-4 px-4 py-4 border-t border-border items-center"
            >
              <div className="col-span-4">
                <div className="font-mono">
                  {user.username}
                </div>

                {user.role === "admin" && (
                  <div className="label-mono mt-1">
                    Administrator
                  </div>
                )}
              </div>

              <div className="col-span-4">
                {user.role === "admin" ? (
                  <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600 border border-blue-500/20">
                    Administrator
                  </span>
                ) : user.must_change_password ? (
                  <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-600 border border-yellow-500/20">
                    Password Reset Required
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600 border border-green-500/20">
                    Active
                  </span>
                )}
              </div>

              <div className="col-span-4 flex justify-end gap-2">
                {user.role !== "admin" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() =>
                        resetPassword(user.id, user.username)
                      }
                    >
                      Reset Password
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={() =>
                        deleteUser(user.id)
                      }
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Create a new user.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={createUser} className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>

              <Input
                value={form.username}
                onChange={(e) =>
                  setForm({
                    username: e.target.value,
                  })
                }
                placeholder="Username"
                required
              />
            </div>

            <div className="rounded-md border border-border p-3 bg-muted/40 text-sm">
              <div>
                <strong>Default password:</strong> hello123
              </div>

              <div className="mt-2 text-muted-foreground">
                User will be required to change
                their password after first login.
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>

              <Button type="submit">
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

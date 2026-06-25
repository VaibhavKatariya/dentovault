import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, User, ArrowRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await login(username.trim(), password);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error || "Login failed");
      return;
    }
    toast.success("Welcome back");
    navigate("/");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left: form */}
      <div className="flex flex-col px-6 sm:px-12 lg:px-20 py-10 relative">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-2xl font-semibold tracking-tight">DENTOVAULT</div>
            <div className="label-mono mt-1">research vault · v1.0</div>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm mx-auto">
            <div className="label-mono mb-3">access portal</div>
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight font-light mb-2">
              Sign in to your<br />research vault.
            </h1>
            <p className="text-sm text-muted-foreground mb-10 leading-relaxed">
              Private, locally hosted medical image storage for dental research workflows.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="label-mono">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    data-testid="login-username-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    autoComplete="username"
                    className="pl-9 h-11 font-mono text-sm"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="label-mono">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    data-testid="login-password-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pl-9 h-11 font-mono text-sm"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                data-testid="login-submit-button"
                disabled={submitting}
                className="w-full h-11 group"
              >
                {submitting ? "Signing in…" : (
                  <span className="flex items-center justify-center gap-2">
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-10 pt-6 border-t border-border">
              <div className="label-mono mb-2">default credentials</div>
              <div className="font-mono text-xs text-muted-foreground">
                username: <span className="text-foreground">admin</span><br />
                password: <span className="text-foreground">admin123</span>
              </div>
            </div>
          </div>
        </div>

        <div className="label-mono text-[10px]">
          © {new Date().getFullYear()} dentovault · local lan deployment
        </div>
      </div>

      {/* Right: image */}
      <div className="hidden lg:block relative bg-muted overflow-hidden border-l border-border">
        <img
          src="https://images.unsplash.com/photo-1582560475093-ba66accbc424?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400"
          alt="Medical research lab"
          className="absolute inset-0 w-full h-full object-cover opacity-90 dark:opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-background/40 via-transparent to-background/20 dark:from-background/70" />
        <div className="absolute bottom-10 left-10 right-10">
          <div className="label-mono mb-3">secure · private · local</div>
          <h2 className="font-display text-3xl sm:text-4xl font-light tracking-tight max-w-md">
            Image archives, on your terms.
          </h2>
          <p className="text-sm text-muted-foreground mt-4 max-w-sm">
            No cloud. No third parties. Just clean storage with full audit visibility.
          </p>
        </div>
      </div>
    </div>
  );
}
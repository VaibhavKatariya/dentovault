"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, User, ArrowRight, LayoutList } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Image from "next/image";
import Link from "next/link";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    if (user.must_change_password) {
      router.replace("/settings");
    } else {
      router.replace("/");
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitting(true);

    const res = await login(username.trim(), password);

    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error || "Login failed");
      return;
    }
    
    if (res.user.must_change_password) {
      toast.warning("User must change default password");
      router.replace("/settings");
      return;
    }
    
    toast.success("Welcome back");

    router.replace("/");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="flex flex-col px-6 sm:px-12 lg:px-20 py-10 relative">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-2xl font-semibold tracking-tight">
              DENTOVAULT
            </div>
            <div className="label-mono mt-1">
              research vault · v1.0
            </div>
          </div>

          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm mx-auto">
            <div className="label-mono mb-3">access portal</div>

            <h1 className="font-display text-4xl sm:text-5xl tracking-tight font-light mb-2">
              Sign in to your
              <br />
              research vault.
            </h1>

            <p className="text-sm text-muted-foreground mb-10 leading-relaxed">
              Private, locally hosted medical image storage for dental
              research workflows.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="label-mono">
                  Username
                </Label>

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
                <Label htmlFor="password" className="label-mono">
                  Password
                </Label>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                  <Input
                    id="password"
                    type="password"
                    data-testid="login-password-input"
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
                disabled={submitting}
                data-testid="login-submit-button"
                className="w-full h-11 group"
              >
                {submitting ? (
                  "Signing in..."
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="hidden lg:block relative bg-muted overflow-hidden border-l border-border">
        <Image
          src="/loginImg.jpg"
          alt="Medical research lab"
          fill
          priority
          className="object-cover opacity-90 dark:opacity-60"
        />

        <div className="absolute inset-0 bg-gradient-to-tr from-background/40 via-transparent to-background/20 dark:from-background/70" />

        <div className="absolute bottom-10 left-10 right-10 z-10">
          <div className="label-mono mb-3">secure · private · local</div>

          <h2 className="font-display text-3xl sm:text-4xl font-light tracking-tight max-w-md">
            Image archives, on your terms.
          </h2>

          <p className="text-sm text-muted-foreground mt-4 max-w-sm">
            Designed and Developed by <Link className="hover:underline hover:text-primary" href="https://kaily.in" target="_blank" rel="noopener noreferrer">
              Vaibhav Katariya
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
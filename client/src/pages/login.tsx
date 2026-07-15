import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trident } from "@/components/logo";
import { Link, useLocation } from "wouter";

export default function Login() {
  const { login, register, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({
    email: "", password: "", username: "", fullName: "", city: "", country: "",
  });

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        toast({ title: "Welcome back." });
      } else {
        await register(form);
        toast({ title: "Account created." });
      }
      navigate("/dashboard");
    } catch (err) {
      toast({
        title: "Something went wrong",
        description: err instanceof Error ? err.message.split(":").slice(1).join(":").trim() : "Try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center paper-grain px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Trident size={56} />
          <h1 className="mt-4 font-display text-3xl tracking-[0.2em]">ZACKERZ</h1>
          <p className="mt-1 text-sm text-muted-foreground">Loyalty and Honesty.</p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              {mode === "login" ? "Sign in" : "Create your account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" data-testid="input-fullName" value={form.fullName} onChange={update("fullName")} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" data-testid="input-city" value={form.city} onChange={update("city")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="country">Country</Label>
                      <Input id="country" data-testid="input-country" value={form.country} onChange={update("country")} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" data-testid="input-username" value={form.username} onChange={update("username")} required />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" data-testid="input-email" value={form.email} onChange={update("email")} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" data-testid="input-password" value={form.password} onChange={update("password")} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit">
                {isLoading ? "…" : mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "login" ? "No account yet? " : "Already a member? "}
              <button
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="font-medium text-primary hover:underline"
              >
                {mode === "login" ? "Register" : "Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Not a member yet?{" "}
          <Link href="/apply" className="font-medium text-primary hover:underline">Apply to the Order</Link>
        </p>
      </div>
    </div>
  );
}

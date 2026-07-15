import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { VALUES } from "@/lib/values";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import PublicLayout from "@/components/public-layout";

const STEPS = ["Identity", "Background", "Alignment", "Review"];

export default function Apply() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    age: "",
    country: user?.country || "",
    city: user?.city || "",
    field: user?.field || "",
    yearsExperience: "",
    whyJoin: "",
    valuesAlignment: "",
    contribution: "",
    referral: "",
  });

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const canProceed = () => {
    if (step === 0) return form.fullName.trim() && form.email.trim() && form.age.trim();
    if (step === 1) return form.country.trim() && form.city.trim() && form.field.trim() && form.yearsExperience.trim();
    if (step === 2) return form.whyJoin.trim().length >= 20 && form.valuesAlignment.trim().length >= 20 && form.contribution.trim().length >= 20;
    return true;
  };

  const submit = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/applications", form);
      setDone(true);
      toast({ title: "Application submitted.", description: "The Order will be in touch." });
    } catch (err) {
      toast({
        title: "Could not submit",
        description: err instanceof Error ? err.message.split(":").slice(1).join(":").trim() : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <section className="border-b border-border paper-grain">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-primary">Application</p>
          <h1 className="font-display text-5xl leading-tight text-balance sm:text-6xl">
            One standard: <span className="italic text-primary">Honor.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Each applicant is interviewed personally. Historically, only around 5% are accepted.
          </p>
        </div>
      </section>

      {/* The fifteen standards — preview before you apply */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">The Fifteen Standards</p>
            <h2 className="font-display text-3xl text-balance sm:text-4xl">
              Know the code before you knock.
            </h2>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((v) => (
              <li key={v.num} className="flex gap-3 bg-background p-5" data-testid={`apply-value-${v.num}`}>
                <span className="font-display text-lg leading-none text-primary/70">{v.num}</span>
                <div>
                  <h3 className="font-display text-base">{v.title}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{v.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          {!isAuthenticated ? (
            <Card className="border-border bg-card">
              <CardContent className="p-8 text-center">
                <h2 className="font-display text-2xl">Create an account to apply</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  You'll need an account so we can track your application.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link href="/login"><Button>Sign in or register</Button></Link>
                  <Link href="/order"><Button variant="outline">Read the values first</Button></Link>
                </div>
              </CardContent>
            </Card>
          ) : done ? (
            <Card className="border-border bg-card">
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Check className="h-7 w-7 text-primary" />
                </div>
                <h2 className="font-display text-3xl">Application received.</h2>
                <p className="mt-3 text-muted-foreground">
                  Your application is now under review. The Order interviews each applicant personally.
                  You'll be notified of the outcome. In the meantime, you can explore the chapters and events.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link href="/dashboard"><Button>Go to dashboard</Button></Link>
                  <Link href="/events"><Button variant="outline">Explore events</Button></Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Stepper */}
              <div className="mb-8 flex items-center justify-between">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex flex-1 items-center">
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                      i <= step ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"
                    }`}>
                      {i < step ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`mx-2 h-px flex-1 ${i < step ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>
                ))}
              </div>
              <p className="mb-6 text-center text-sm text-muted-foreground">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>

              <Card className="border-border bg-card">
                <CardContent className="p-6 sm:p-8">
                  {step === 0 && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName">Full name</Label>
                        <Input id="fullName" data-testid="input-fullName" value={form.fullName} onChange={update("fullName")} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" data-testid="input-email" value={form.email} onChange={update("email")} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="age">Age</Label>
                        <Input id="age" type="number" min="18" data-testid="input-age" value={form.age} onChange={update("age")} required />
                      </div>
                    </div>
                  )}
                  {step === 1 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="country">Country</Label>
                          <Input id="country" data-testid="input-country" value={form.country} onChange={update("country")} required />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="city">City</Label>
                          <Input id="city" data-testid="input-city" value={form.city} onChange={update("city")} required />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="field">Field of mastery</Label>
                        <Input id="field" data-testid="input-field" placeholder="e.g. Finance, Medicine, Engineering" value={form.field} onChange={update("field")} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="yearsExperience">Years of experience</Label>
                        <Input id="yearsExperience" type="number" min="0" data-testid="input-years" value={form.yearsExperience} onChange={update("yearsExperience")} required />
                        <p className="text-xs text-muted-foreground">We expect at least 5 years of mastery.</p>
                      </div>
                    </div>
                  )}
                  {step === 2 && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="whyJoin">Why do you want to join ZACKERZ?</Label>
                        <Textarea id="whyJoin" rows={4} data-testid="input-whyJoin" value={form.whyJoin} onChange={update("whyJoin")} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="valuesAlignment">Which of our values resonates most, and why?</Label>
                        <Textarea id="valuesAlignment" rows={4} data-testid="input-values" value={form.valuesAlignment} onChange={update("valuesAlignment")} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="contribution">What will you bring to the circle?</Label>
                        <Textarea id="contribution" rows={4} data-testid="input-contribution" value={form.contribution} onChange={update("contribution")} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="referral">Referral (optional)</Label>
                        <Input id="referral" data-testid="input-referral" value={form.referral} onChange={update("referral")} />
                      </div>
                    </div>
                  )}
                  {step === 3 && (
                    <div className="space-y-3">
                      <h3 className="font-display text-2xl">Review your application</h3>
                      <dl className="divide-y divide-border text-sm">
                        {Object.entries(form).map(([k, v]) => v && (
                          <div key={k} className="flex justify-between gap-4 py-2.5">
                            <dt className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</dt>
                            <dd className="text-right max-w-[60%]">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  <div className="mt-8 flex justify-between">
                    <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
                      <ChevronLeft className="mr-1 h-4 w-4" /> Back
                    </Button>
                    {step < STEPS.length - 1 ? (
                      <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} data-testid="button-next">
                        Next <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button onClick={submit} disabled={submitting} data-testid="button-submit-application">
                        {submitting ? "Submitting…" : "Submit application"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

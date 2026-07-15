import PublicLayout from "@/components/public-layout";
import { VALUES } from "@/lib/values";
import { Shield, Mountain, Users, BookOpen } from "lucide-react";

const PILLARS = [
  { icon: Shield, title: "Honor", body: "The first measure of a human. We hold the line when it costs, and keep our word as bond. Without honor, the organisation is just a club." },
  { icon: Mountain, title: "Discipline", body: "Mastery over years, not weekends. We forge strength through ordeal — physical, mental, spiritual — never through comfort." },
  { icon: Users, title: "Organisation", body: "Real bonds, made in person. Local chapters that hold each other accountable to a higher standard than the world demands." },
  { icon: BookOpen, title: "Independence", body: "We pass on tools, contacts, and knowledge that make each human more sovereign — in capital, mind, and body." },
];

export default function Order() {
  return (
    <PublicLayout>
      <section className="paper-grain border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-primary">The Order</p>
          <h1 className="font-display text-5xl leading-tight text-balance sm:text-6xl">
            Values that built empires, run for the humans building the next ones.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            ZACKERZ is not for everyone. It is for humans with at least five years of mastery
            in their field, who bring something real to the circle. This is not a place to
            figure yourself out.
          </p>
        </div>
      </section>

      {/* The Fifteen Standards */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">The Fifteen Standards</p>
            <h2 className="font-display text-4xl text-balance sm:text-5xl">
              Fifteen values. One standard.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              The code every member lives by — not slogans, but the standard we hold each other to.
            </p>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((v) => (
              <li
                key={v.num}
                className="flex gap-4 bg-card p-6 transition-colors hover:bg-surface-alt"
                data-testid={`value-card-${v.num}`}
              >
                <span className="font-display text-2xl leading-none text-primary/70">{v.num}</span>
                <div>
                  <h3 className="font-display text-xl">{v.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-card border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">The Four Pillars</p>
            <h2 className="font-display text-4xl text-balance sm:text-5xl">What holds it all together.</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div key={p.title} className="border border-border bg-background p-7 rounded-lg">
                <p.icon className="mb-4 h-8 w-8 text-primary" />
                <h2 className="font-display text-2xl">{p.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-card">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl text-balance">The Zackerz Progression</h2>
          <p className="mt-3 text-muted-foreground">A path of inner transformation — three ranks that lead you from strength to sovereignty.</p>
          <ol className="mt-8 space-y-6">
            {[
              { n: "I", t: "Aspirant", d: "You enter the circle. Tested in alignment, not wealth. You observe, you contribute, you prove." },
              { n: "II", t: "Member", d: "Full member. The Favor of Honor is granted. You open or join a local chapter and take on mentees." },
              { n: "III", t: "Sovereign", d: "You hold position. You mentor across chapters, lead expeditions, and shape the direction of the Order." },
            ].map((r) => (
              <li key={r.n} className="flex gap-5">
                <span className="font-display text-3xl text-primary">{r.n}</span>
                <div>
                  <h3 className="font-display text-xl">{r.t}</h3>
                  <p className="text-sm text-muted-foreground">{r.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </PublicLayout>
  );
}

import PublicLayout from "@/components/public-layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const FAQS = [
  {
    q: "Who is ZACKERZ for?",
    a: "Humans with at least five years of mastery in their field, who bring something real to the circle. All ethnicities, all faiths. One standard: Honor. This is not a place to figure yourself out.",
  },
  {
    q: "Is it digital or physical?",
    a: "Physical, not digital. The power of a global network is concentrated in local chapters. The physical will make you stronger and create real bonds. Our digital tools serve the in-person organisation.",
  },
  {
    q: "How do I join?",
    a: "Each applicant is interviewed personally — not to assess wealth or fame, but alignment with our values. We test our applicants, then offer full members the Favor of Honor. Historically, only around 5% are accepted.",
  },
  {
    q: "What does membership cost?",
    a: "Standard membership is €1,799 per year. Complete membership is €2,799 per year, which adds Founders' Circle access, priority expeditions, and direct mentor pairing. Both are yearly commitments.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, your membership can be cancelled at any time. However, there are no pro-rata refunds.",
  },
  {
    q: "Is ZACKERZ only for humans?",
    a: "Yes. The organisation is humans-only. All faiths and ethnicities are welcome — the single standard is honor.",
  },
  {
    q: "Are there sanctioned-country restrictions?",
    a: "We currently cannot accept applications from sanctioned countries. This is a legal, not a values, limitation.",
  },
  {
    q: "What actually happens at events?",
    a: "Expeditions expand your skill level, push your comfort zone, and build connections to last a lifetime. From America to Australia, to Athos — pilgrimages, masterclasses, survival experiences, and Zackerz Fests.",
  },
];

export default function FAQ() {
  return (
    <PublicLayout>
      <section className="border-b border-border paper-grain">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-primary">FAQ</p>
          <h1 className="font-display text-5xl leading-tight text-balance sm:text-6xl">Questions, answered plainly.</h1>
        </div>
      </section>
      <section>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-b border-border">
                <AccordionTrigger className="font-display text-xl hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-12 text-center">
            <Link href="/apply"><Button size="lg">Begin your application</Button></Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

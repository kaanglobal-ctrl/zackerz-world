import { Link } from "wouter";
import Logo from "./logo";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo size={34} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            A private organisation for humans of honor. Mentorship, expeditions, and a
            global network across 40+ countries — built on loyalty, discipline, and
            independence.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            <a href="https://www.zackerz.com" className="hover:text-primary">www.zackerz.com</a>
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-foreground/60">
            The Order
          </h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/order" className="text-muted-foreground hover:text-primary">Our values</Link></li>
            <li><Link href="/membership" className="text-muted-foreground hover:text-primary">Membership</Link></li>
            <li><Link href="/chapters" className="text-muted-foreground hover:text-primary">Chapters</Link></li>
            <li><Link href="/events" className="text-muted-foreground hover:text-primary">Events</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-foreground/60">
            Join
          </h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/apply" className="text-muted-foreground hover:text-primary">Apply</Link></li>
            <li><Link href="/login" className="text-muted-foreground hover:text-primary">Sign in</Link></li>
            <li><Link href="/faq" className="text-muted-foreground hover:text-primary">FAQ</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} ZACKERZ. All rights reserved.</p>
          <p className="font-display italic">Loyalty and Honesty.</p>
        </div>
      </div>
    </footer>
  );
}

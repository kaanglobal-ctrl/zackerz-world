import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Menu, X, Sun, Moon, MessagesSquare } from "lucide-react";
import Logo from "./logo";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useMessageDock } from "@/hooks/use-message-dock";
import { Button } from "@/components/ui/button";
import FlightDeckButton from "./flight-deck-button";
import { cn } from "@/lib/utils";
import { isWorldDomain } from "@/lib/domain";

const PUBLIC_NAV = [
  { label: "Order", href: "/order" },
  { label: "Membership", href: "/membership" },
  { label: "Chapters", href: "/chapters" },
  { label: "Events", href: "/events" },
  { label: "Apply", href: "/apply" },
];

// Member tab pills. "Clubs" maps to the members directory.
const MEMBER_NAV = [
  { label: "Network", href: "/network" },
  { label: "Chapters", href: "/chapters" },
  { label: "Clubs", href: "/clubs" },
  { label: "Events", href: "/events" },
];

const UNIVERSE_HREF = "/universe";

/**
 * MemberTabPill — rounded uppercase pill in the Flight-Deck family.
 * accent="blue" is reserved for the Universe tab (neon-blue active glow);
 * other tabs use the gold accent. When the Universe tab is active it is the
 * only pill shown (the nav collapses), per the founder's design.
 */
function MemberTabPill({
  href,
  label,
  active,
  accent = "gold",
  onNavigate,
  testId,
}: {
  href: string;
  label: string;
  active?: boolean;
  accent?: "gold" | "blue";
  onNavigate?: () => void;
  testId?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-md border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all duration-200";
  const activeCls =
    accent === "blue"
      ? "border-[#4aa3ff] text-[#eaf4ff] shadow-[0_0_14px_-2px_rgba(74,163,255,0.8),0_0_4px_rgba(74,163,255,0.5)]"
      : "border-[#d4a84b] text-[#e8c56a] shadow-[0_0_14px_-2px_rgba(212,168,75,0.75),0_0_4px_rgba(212,168,75,0.45)]";
  const idleCls =
    accent === "blue"
      ? "border-[#3a4a63]/70 text-[#cfe0f5]/85 hover:border-[#4aa3ff]/60 hover:text-[#cfe0f5]"
      : "border-[#5a4a32]/70 text-[#e8e2d6]/85 hover:border-[#d4a84b]/55 hover:text-[#e8c56a]";
  return (
    <Link
      href={href}
      onClick={onNavigate}
      data-testid={testId}
      aria-current={active ? "page" : undefined}
      className={cn(base, active ? activeCls : idleCls)}
      style={{
        background:
          active
            ? accent === "blue"
              ? "linear-gradient(180deg, rgba(74,163,255,0.12), transparent)"
              : "linear-gradient(180deg, rgba(212,168,75,0.10), transparent)"
            : accent === "blue"
              ? "linear-gradient(180deg, rgba(74,163,255,0.04), transparent)"
              : "linear-gradient(180deg, rgba(212,168,75,0.03), transparent)",
      }}
    >
      {label}
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { isOpen, toggleDock } = useMessageDock();
  const onUniverse = location === UNIVERSE_HREF;

  // Member pills. On the Universe route the nav collapses to just the
  // (blue, active) Universe pill — the other tabs reappear on any other route.
  const renderMemberPills = (onNavigate?: () => void) =>
    onUniverse ? (
      <MemberTabPill
        href={UNIVERSE_HREF}
        label="Universe"
        active
        accent="blue"
        onNavigate={onNavigate}
        testId="nav-universe"
      />
    ) : (
      <>
        <MemberTabPill
          href={UNIVERSE_HREF}
          label="Universe"
          active={false}
          accent="gold"
          onNavigate={onNavigate}
          testId="nav-universe"
        />
        {MEMBER_NAV.map((item) => {
          const active = location === item.href;
          return (
            <MemberTabPill
              key={item.href}
              href={item.href}
              label={item.label}
              active={active}
              accent="gold"
              onNavigate={onNavigate}
              testId={`nav-${item.label.toLowerCase()}`}
            />
          );
        })}
      </>
    );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo size={34} />

        <nav
          className={cn(
            "hidden items-center gap-2 md:flex",
            // On the Universe route the nav collapses to a single (blue, active)
            // Universe pill. Anchor it to the left, just after the logo, instead
            // of letting justify-between float it toward the center.
            onUniverse && "ml-4 sm:ml-6 mr-auto"
          )}
        >
          {isAuthenticated
            ? renderMemberPills()
            : PUBLIC_NAV.map((item) => {
                const active = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-md px-3 py-2 text-sm transition-colors hover:text-primary ${
                      active ? "text-primary" : "text-foreground/70"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated && (
            <button
              onClick={toggleDock}
              className={`relative rounded-md p-2 transition-colors hover:text-primary ${isOpen ? "text-primary" : "text-foreground/70"}`}
              aria-label="Toggle messages"
              data-testid="button-messages-dock"
            >
              <MessagesSquare size={18} />
            </button>
          )}
          <button
            onClick={toggle}
            className="rounded-md p-2 text-foreground/70 transition-colors hover:text-primary"
            aria-label="Toggle theme"
            data-testid="button-theme-toggle"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {isAuthenticated ? (
            <>
              <FlightDeckButton />
              {user?.role === "admin" && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm">
                    Admin
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                data-testid="button-logout"
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              {!isWorldDomain() && (
                <Link href="/login">
                  <Button variant="ghost" size="sm" data-testid="button-login">
                    Sign in
                  </Button>
                </Link>
              )}
              <Link href="/apply">
                <Button size="sm" data-testid="button-apply-nav">
                  Apply
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="rounded-md p-2 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3">
            {isAuthenticated
              ? renderMemberPills(() => setOpen(false))
              : PUBLIC_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-3 text-sm text-foreground/80 hover:bg-accent"
                  >
                    {item.label}
                  </Link>
                ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              <button
                onClick={() => toggle()}
                className="flex items-center gap-2 rounded-md px-3 py-3 text-sm text-foreground/80 hover:bg-accent"
                aria-label="Toggle theme"
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                {theme === "light" ? "Dark mode" : "Light mode"}
              </button>
              {isAuthenticated ? (
                <>
                  <FlightDeckButton fullWidth onNavigate={() => setOpen(false)} />
                  <Button variant="ghost" className="w-full" onClick={() => { setOpen(false); logout(); }}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  {!isWorldDomain() && (
                    <Link href="/login" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full">Sign in</Button>
                    </Link>
                  )}
                  <Link href="/apply" onClick={() => setOpen(false)}>
                    <Button className="w-full">Apply</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

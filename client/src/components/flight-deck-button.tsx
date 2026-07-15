import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

/**
 * FlightDeckButton
 * Kupfer-Stil Flight-Deck-Tab für die Navbar (ersetzt den bisherigen "Dashboard"-Button).
 * Split-Icon (purple/dark) + "FLIGHT DECK" Wortmarke, copper border + glow.
 * Verlinkt auf /dashboard; active-State wenn man auf /dashboard ist.
 */
export default function FlightDeckButton({
  fullWidth = false,
  onNavigate,
}: {
  fullWidth?: boolean;
  onNavigate?: () => void;
}) {
  const [location] = useLocation();
  const active = location === "/dashboard";

  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      data-testid="button-dashboard"
      aria-label="Flight Deck"
      className={cn(
        "group relative inline-flex items-center gap-2 rounded-md border px-3 py-1.5",
        "text-[11px] font-semibold uppercase tracking-[0.18em] transition-all duration-200",
        fullWidth && "w-full justify-center",
        active
          ? "border-primary/80 text-primary shadow-[0_0_12px_-2px_hsl(var(--primary)/0.7),inset_0_0_8px_-4px_hsl(var(--primary)/0.6)]"
          : "border-primary/60 text-[#f0c9a6] hover:border-primary hover:shadow-[0_0_14px_-3px_hsl(var(--primary)/0.7)]",
      )}
      style={{
        background:
          "linear-gradient(180deg, hsl(var(--primary)/0.06), transparent)",
      }}
    >
      {/* Split-Icon */}
      <span
        className={cn(
          "relative block h-4 w-4 overflow-hidden rounded-full border border-primary/70 transition-shadow duration-200",
          active
            ? "shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
            : "shadow-none group-hover:shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
        )}
      >
        <span
          className="absolute inset-x-0 top-0 bottom-1/2"
          style={{ background: "linear-gradient(180deg,#7a5589,#6b4a7a)" }}
        />
        <span
          className="absolute inset-x-0 top-1/2 bottom-0"
          style={{ background: "linear-gradient(180deg,#1d1418,#0d0a0e)" }}
        />
        <span
          className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
          style={{ background: "hsl(var(--primary))" }}
        />
      </span>
      Flight Deck
    </Link>
  );
}

import { cn } from "@/lib/utils";

interface MemberLevelBadgeProps {
  tier?: "prospect" | "mindset" | "executive" | "og" | string | null;
  className?: string;
}

const LEVELS: Record<string, { label: string; className: string }> = {
  prospect: {
    label: "Prospect",
    className: "border-border bg-accent text-accent-foreground",
  },
  mindset: {
    label: "Mindset & Success",
    className: "border-secondary/40 bg-secondary/10 text-secondary",
  },
  executive: {
    label: "Executive",
    className: "border-primary/40 bg-primary/10 text-primary",
  },
  og: {
    label: "OG ZACKERS CIRCLE OF TRUST",
    className: "border-primary bg-primary text-primary-foreground",
  },
};

export default function MemberLevelBadge({ tier, className }: MemberLevelBadgeProps) {
  const level = tier ? LEVELS[tier] : null;
  if (!level) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        level.className,
        className,
      )}
    >
      {level.label}
    </span>
  );
}

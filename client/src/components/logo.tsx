import { Link } from "wouter";

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

export function Trident({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="12" fill="hsl(var(--primary))" />
      <g fill="hsl(var(--background))">
        <path d="M32 6 L36.6 15 L33.4 15 L33.4 27 L30.6 27 L30.6 15 L27.4 15 Z" />
        <path d="M20 10 L24.6 19 L21.4 19 L21.4 27 L18.6 27 L18.6 19 L15.4 19 Z" />
        <path d="M44 10 L48.6 19 L45.4 19 L45.4 27 L42.6 27 L42.6 19 L39.4 19 Z" />
        <path d="M15 30.5 Q32 39 49 30.5 L49 27 Q32 35.5 15 27 Z" />
      </g>
      <path fill="hsl(var(--secondary))" d="M27 37 L37 37 L37 38.6 L29.2 52 L37 52 L37 53.6 L27 53.6 L27 51.9 L34.8 38.6 L27 38.6 Z" />
    </svg>
  );
}

export default function Logo({ size = 36, withWordmark = true, className = "" }: LogoProps) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`} data-testid="logo">
      <Trident size={size} />
      {withWordmark && (
        <span
          className="font-display text-2xl tracking-[0.2em] text-foreground leading-none"
          style={{ fontWeight: 400 }}
        >
          ZACKERZ
        </span>
      )}
    </Link>
  );
}

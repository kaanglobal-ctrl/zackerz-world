import { useEffect, useState } from "react";
import { Trident } from "@/components/logo";

type CurtainIntroProps = {
  /** Small gold label shown under the wordmark (e.g. "CHAPTERS"). */
  label?: string;
  /** How long the curtain stays down before rising, in ms. */
  delayMs?: number;
  /** Duration of the rising animation, in ms. */
  durationMs?: number;
};

type Phase = "hold" | "rising" | "done";

/**
 * Decorative intro "curtain" — a full-screen overlay that covers the page on
 * load, holds for `delayMs`, then rises upward like a stage curtain to reveal
 * the page beneath. Decorative only (aria-hidden, no focusable content).
 */
export default function CurtainIntro({
  label,
  delayMs = 3000,
  durationMs = 1000,
}: CurtainIntroProps) {
  const [phase, setPhase] = useState<Phase>("hold");

  const risen = phase === "rising" || phase === "done";

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setPhase("done");
      return;
    }

    const riseTimer = window.setTimeout(() => setPhase("rising"), delayMs);
    const doneTimer = window.setTimeout(() => setPhase("done"), delayMs + durationMs);

    return () => {
      window.clearTimeout(riseTimer);
      window.clearTimeout(doneTimer);
    };
  }, [delayMs, durationMs]);

  return (
    <div
      aria-hidden="true"
      className={`curtain-intro${risen ? " curtain-intro--rising" : ""}`}
      style={{ transitionDuration: `${durationMs}ms` }}
    >
      <div className="curtain-intro__inner">
        <Trident size={56} className="curtain-intro__trident" />
        <span className="curtain-intro__wordmark">ZACKERZ</span>
        {label && <span className="curtain-intro__label">{label}</span>}
      </div>
      <div className="curtain-intro__hem" />
    </div>
  );
}

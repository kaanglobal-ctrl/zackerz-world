import { useEffect, useState, type ReactNode, type CSSProperties } from "react";

type HeroCurtainProps = {
  children: ReactNode;
  /** How long the hero stays before rising, in ms. */
  delayMs?: number;
  /** Duration of the rising animation, in ms. */
  durationMs?: number;
};

type Phase = "hold" | "rising" | "done";

/**
 * Wraps a hero block so that it sits on load, then rises upward like a curtain
 * after `delayMs` — sliding its content up while collapsing its height so the
 * content beneath fills the space.
 */
export default function HeroCurtain({
  children,
  delayMs = 3000,
  durationMs = 1000,
}: HeroCurtainProps) {
  const [phase, setPhase] = useState<Phase>("hold");

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

  if (phase === "done") return null;

  const style = {
    "--hero-curtain-duration": `${durationMs}ms`,
  } as CSSProperties;

  return (
    <div
      className={`hero-curtain${phase === "rising" ? " hero-curtain--rising" : ""}`}
      style={style}
    >
      <div className="hero-curtain__inner">{children}</div>
    </div>
  );
}

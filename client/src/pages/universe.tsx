import { lazy, Suspense } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Navbar from "@/components/navbar";

const MemberUniverseHero = lazy(() => import("@/components/member-universe-hero"));

/**
 * Dedicated "Universe" page — the full 3D member universe hero on its own route.
 * Logged-in members only; the nav collapses to just the (blue) Universe pill here.
 */
export default function UniversePage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-[100svh] w-full items-center justify-center bg-[#05060a] text-sm text-muted-foreground">
        Opening the Member Universe…
      </div>
    );
  }
  if (!isAuthenticated) return <Redirect to="/login" />;

  return (
    <div className="min-h-[100svh] bg-[#05060a]">
      <Navbar />
      <Suspense
        fallback={
          <div className="flex h-[100svh] w-full items-center justify-center bg-[#05060a] text-sm text-muted-foreground">
            Opening the Member Universe…
          </div>
        }
      >
        <MemberUniverseHero />
      </Suspense>
    </div>
  );
}

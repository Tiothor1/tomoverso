"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LaunchPage } from "@/components/launch/launch-page";

export function LaunchGate({ children }: { children: ReactNode }) {
  const [released, setReleased] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/admin/release")
      .then((r) => r.json())
      .then((data) => setReleased(data.released === true))
      .catch(() => setReleased(false));
  }, []);

  // While loading, show a minimal dark screen
  if (released === null) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050806]">
        <div className="h-8 w-8 animate-pulse rounded-full border-2 border-amber-300/40 border-t-amber-200" />
      </div>
    );
  }

  if (!released) {
    return <LaunchPage />;
  }

  return <>{children}</>;
}

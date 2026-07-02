"use client";

import dynamic from "next/dynamic";

// The game touches window/canvas/AudioContext everywhere — never SSR it.
const GameShell = dynamic(() => import("./GameShell"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center py-16">
      <div className="h-[480px] w-[240px] animate-pulse rounded-md border border-border bg-surface" />
    </div>
  ),
});

export default function GameClient() {
  return <GameShell />;
}

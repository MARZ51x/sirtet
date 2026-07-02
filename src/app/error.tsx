"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <p className="text-xl font-bold text-text">Something toppled over.</p>
      <p className="text-sm text-text-muted">
        An unexpected error occurred. Your settings and scores are safe.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-accent px-4 py-2 font-semibold text-on-accent hover:opacity-90"
      >
        Reload
      </button>
    </div>
  );
}

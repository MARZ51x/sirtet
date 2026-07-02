import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <p className="font-mono text-6xl font-black text-accent">404</p>
      <p className="text-text">
        That page slid off the board.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-accent px-4 py-2 font-semibold text-on-accent hover:opacity-90"
      >
        Back to the game
      </Link>
    </div>
  );
}

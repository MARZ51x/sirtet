import Link from "next/link";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 text-sm leading-6 text-text">
      <h1 className="mb-4 text-2xl font-bold">Privacy</h1>
      <p className="mb-4 text-text-muted">
        Sirtet stores the minimum needed to run a leaderboard.
      </p>

      <h2 className="mb-1 font-semibold">What we store</h2>
      <ul className="mb-4 list-disc pl-5 text-text-muted">
        <li>
          <strong className="text-text">Account:</strong> your email address
          (for sign-in and password resets — never shown publicly) and your
          username (shown on the public leaderboard).
        </li>
        <li>
          <strong className="text-text">Scores:</strong> results of games you
          submit while signed in (mode, score, lines, level, duration, date).
          These are publicly visible next to your username.
        </li>
        <li>
          <strong className="text-text">Settings:</strong> your theme, sliders,
          and key bindings — synced to your account when signed in, otherwise
          kept only in your browser.
        </li>
        <li>
          <strong className="text-text">Background image:</strong> if you
          upload one, it is stored on our hosting (Supabase Storage) and served
          from a public URL.
        </li>
      </ul>

      <h2 className="mb-1 font-semibold">What we don&apos;t do</h2>
      <p className="mb-4 text-text-muted">
        No ads, no selling data, no third-party trackers. Basic anonymous page
        analytics (Vercel Analytics) may be collected to keep the site healthy.
      </p>

      <h2 className="mb-1 font-semibold">Deleting your data</h2>
      <p className="mb-4 text-text-muted">
        Delete your account any time from your{" "}
        <Link
          href="/profile"
          className="text-accent underline underline-offset-4"
        >
          profile page
        </Link>
        . This permanently removes your account, settings, uploaded background,
        and all leaderboard scores.
      </p>

      <p className="text-text-muted">
        Questions? Open an issue on the project&apos;s GitHub repository.
      </p>
    </div>
  );
}

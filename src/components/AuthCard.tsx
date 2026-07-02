export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-start justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-xl">
        <h1 className="mb-5 text-center text-xl font-bold text-text">
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}

export const inputCls =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-none";
export const labelCls =
  "mb-1 block text-xs font-semibold tracking-widest text-text-muted";
export const primaryBtnCls =
  "w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-on-accent hover:opacity-90 disabled:opacity-50";
export const errorCls = "text-sm text-danger";

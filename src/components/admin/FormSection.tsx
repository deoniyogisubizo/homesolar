export function FormSection({
  title,
  description,
  children,
  aside,
  fullWidth = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <section
      className={`grid gap-4 rounded-[8px] border border-admin-line bg-white p-5 ${
        fullWidth ? "" : "lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-6"
      }`}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-[12px] text-admin-muted">{description}</p> : null}
        <div className="mt-4">{children}</div>
      </div>
      {aside ? <aside className="min-w-0 border-t border-admin-line pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">{aside}</aside> : null}
    </section>
  );
}

export function FieldGrid({ children, columns = 2 }: { children: React.ReactNode; columns?: 1 | 2 | 3 }) {
  return (
    <div className={`grid gap-4 ${columns === 1 ? "" : columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
      {children}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="admin-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="admin-help">{hint}</p> : null}
      {error ? <p className="admin-error">{error}</p> : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[6px] border border-danger/20 bg-danger-pale px-3 py-2 text-[13px] text-danger">
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-[6px] border border-success/20 bg-success-pale px-3 py-2 text-[13px] text-success" role="status">
      {message}
    </p>
  );
}

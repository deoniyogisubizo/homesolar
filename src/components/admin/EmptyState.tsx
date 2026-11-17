export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[8px] border border-dashed border-admin-line bg-white px-6 py-14 text-center">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      <p className="mt-1 max-w-md text-[13px] text-admin-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

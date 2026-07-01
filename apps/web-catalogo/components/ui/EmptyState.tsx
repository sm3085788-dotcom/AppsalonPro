import { PackageOpen } from 'lucide-react';

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong px-6 py-20 text-center">
      <PackageOpen className="mb-5 h-9 w-9 text-border-strong" strokeWidth={1} />
      <h3 className="text-xl font-light text-cream">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm font-light leading-relaxed text-muted">
          {description}
        </p>
      )}
    </div>
  );
}

import { PackageOpen } from 'lucide-react';

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      <PackageOpen className="mb-4 h-10 w-10 text-border" />
      <h3 className="text-lg font-medium text-cream">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted">{description}</p>
      )}
    </div>
  );
}

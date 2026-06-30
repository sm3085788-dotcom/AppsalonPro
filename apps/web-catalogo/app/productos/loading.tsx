import { Skeleton, CardGridSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <Skeleton className="mb-3 h-4 w-20" />
      <Skeleton className="mb-10 h-10 w-64" />
      <CardGridSkeleton count={6} />
    </div>
  );
}

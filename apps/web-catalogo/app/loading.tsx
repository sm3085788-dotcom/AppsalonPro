import { Skeleton, CardGridSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="space-y-5">
          <Skeleton className="h-6 w-40" rounded="full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="mx-auto h-[480px] w-[260px]" rounded="lg" />
      </div>
      <div className="mt-20">
        <CardGridSkeleton count={3} />
      </div>
    </div>
  );
}

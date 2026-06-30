import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Skeleton className="mb-3 h-4 w-28" />
      <Skeleton className="mb-10 h-10 w-72" />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-72 w-full" rounded="lg" />
        <Skeleton className="h-56 w-full" rounded="lg" />
      </div>
    </div>
  );
}

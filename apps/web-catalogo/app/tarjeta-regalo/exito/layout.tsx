import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function GiftCardExitoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-muted">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

import dynamic from 'next/dynamic';
import { getGiftCardReviewStatusForPage } from '@/app/gift-card-review/actions';
import { getGoogleReviews } from '@/lib/data/googleReviews';

const GoogleReviewsSection = dynamic(
  () =>
    import('@/components/home/GoogleReviewsSection').then((m) => ({
      default: m.GoogleReviewsSection,
    })),
  {
    ssr: true,
    loading: () => (
      <div
        className="mx-auto max-w-7xl px-4 pb-4 pt-5 sm:px-6 lg:px-8"
        aria-hidden
      >
        <div className="skeleton h-64 rounded-[29px] sm:h-72" />
      </div>
    ),
  },
);

/** Reseñas + estado gift card (streaming; no bloquea el shell del home). */
export async function HomeReviewsBlock() {
  const [data, giftReviewStatus] = await Promise.all([
    getGoogleReviews(),
    getGiftCardReviewStatusForPage(),
  ]);

  return (
    <GoogleReviewsSection data={data} giftReviewStatus={giftReviewStatus} />
  );
}

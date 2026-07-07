import { getBirthdayClubPublicReviews } from '@/lib/data/birthdayClubReviews';
import { getGiftCardPublicReviews } from '@/lib/data/giftCardReviews';

export type ReviewSource =
  | 'google'
  | 'birthday_club'
  | 'gift_card'
  | 'mixed'
  | 'empty';

export type ClientReview = {
  id: string;
  authorName: string;
  authorPhotoUrl?: string;
  rating: number;
  text: string;
  relativeTime: string;
  source?: 'google' | 'birthday_club' | 'gift_card';
};

/** @deprecated Use ClientReview */
export type GoogleReview = ClientReview;

export type GoogleReviewsPayload = {
  placeName: string;
  rating: number;
  totalReviews: number;
  reviews: ClientReview[];
  googleMapsUrl: string;
  source: ReviewSource;
};

const DEFAULT_MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=Sal%C3%B3n+Andreas+Guatemala';

const EMPTY_PAYLOAD: GoogleReviewsPayload = {
  placeName: 'Salón Andreas',
  rating: 5,
  totalReviews: 0,
  googleMapsUrl: DEFAULT_MAPS_URL,
  source: 'empty',
  reviews: [],
};

function readMapsApiKey(): string {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ''
  );
}

function readPlaceId(): string {
  return (
    process.env.GOOGLE_PLACE_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_PLACE_ID?.trim() ||
    ''
  );
}

type PlacesReview = {
  author_name?: string;
  profile_photo_url?: string;
  rating?: number;
  text?: string;
  relative_time_description?: string;
  time?: number;
};

type PlacesDetailsResponse = {
  status?: string;
  result?: {
    name?: string;
    rating?: number;
    user_ratings_total?: number;
    url?: string;
    reviews?: PlacesReview[];
  };
};

function mapGoogleReview(review: PlacesReview, index: number): ClientReview | null {
  const text = review.text?.trim();
  if (!text) return null;

  return {
    id: `g-${review.time ?? index}-${review.author_name ?? 'anon'}`,
    authorName: review.author_name?.trim() || 'Cliente verificado',
    authorPhotoUrl: review.profile_photo_url,
    rating: Math.min(5, Math.max(1, review.rating ?? 5)),
    text,
    relativeTime: review.relative_time_description?.trim() || 'Reciente',
    source: 'google',
  };
}

async function fetchGoogleReviews(): Promise<GoogleReviewsPayload | null> {
  const placeId = readPlaceId();
  const apiKey = readMapsApiKey();

  if (!placeId || !apiKey) return null;

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set(
      'fields',
      'name,rating,user_ratings_total,reviews,url',
    );
    url.searchParams.set('language', 'es');
    url.searchParams.set('reviews_sort', 'newest');
    url.searchParams.set('key', apiKey);

    const res = await fetch(url.toString(), {
      next: { revalidate: 86_400 },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as PlacesDetailsResponse;
    if (data.status !== 'OK' || !data.result) return null;

    const reviews = (data.result.reviews ?? [])
      .map(mapGoogleReview)
      .filter((r): r is ClientReview => r !== null);

    return {
      placeName: data.result.name?.trim() || 'Salón Andreas',
      rating: data.result.rating ?? 5,
      totalReviews: data.result.user_ratings_total ?? reviews.length,
      googleMapsUrl: data.result.url ?? DEFAULT_MAPS_URL,
      reviews,
      source: 'google',
    };
  } catch {
    return null;
  }
}

function mergeAllReviews(
  birthdayReviews: ClientReview[],
  giftCardReviews: ClientReview[],
  googlePayload: GoogleReviewsPayload | null,
): GoogleReviewsPayload {
  const hasBirthday = birthdayReviews.length > 0;
  const hasGiftCard = giftCardReviews.length > 0;
  const hasGoogle = Boolean(googlePayload?.reviews.length);

  const activeSources = [hasBirthday, hasGiftCard, hasGoogle].filter(Boolean).length;
  if (activeSources === 0) return EMPTY_PAYLOAD;

  if (activeSources === 1) {
    if (hasGoogle && googlePayload) return googlePayload;
    if (hasBirthday) {
      return {
        placeName: 'Salón Andreas',
        rating: 5,
        totalReviews: birthdayReviews.length,
        googleMapsUrl: googlePayload?.googleMapsUrl ?? DEFAULT_MAPS_URL,
        reviews: birthdayReviews,
        source: 'birthday_club',
      };
    }
    return {
      placeName: 'Salón Andreas',
      rating: 5,
      totalReviews: giftCardReviews.length,
      googleMapsUrl: googlePayload?.googleMapsUrl ?? DEFAULT_MAPS_URL,
      reviews: giftCardReviews,
      source: 'gift_card',
    };
  }

  const merged = [...birthdayReviews, ...giftCardReviews, ...(googlePayload?.reviews ?? [])];

  return {
    placeName: googlePayload?.placeName ?? 'Salón Andreas',
    rating: googlePayload?.rating ?? 5,
    totalReviews:
      (googlePayload?.totalReviews ?? 0) + birthdayReviews.length + giftCardReviews.length,
    googleMapsUrl: googlePayload?.googleMapsUrl ?? DEFAULT_MAPS_URL,
    reviews: merged,
    source: 'mixed',
  };
}

/** Reseñas públicas: Club, Tarjeta regalo y Google Business si está configurado. */
export async function getGoogleReviews(): Promise<GoogleReviewsPayload> {
  const [birthdayReviews, giftCardReviews, googlePayload] = await Promise.all([
    getBirthdayClubPublicReviews(),
    getGiftCardPublicReviews(),
    fetchGoogleReviews(),
  ]);

  return mergeAllReviews(birthdayReviews, giftCardReviews, googlePayload);
}

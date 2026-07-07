import { getBirthdayClubPublicReviews } from '@/lib/data/birthdayClubReviews';

export type ReviewSource = 'google' | 'birthday_club' | 'mixed' | 'empty';

export type ClientReview = {
  id: string;
  authorName: string;
  authorPhotoUrl?: string;
  rating: number;
  text: string;
  relativeTime: string;
  source?: 'google' | 'birthday_club';
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

function mergeReviews(
  birthdayReviews: ClientReview[],
  googlePayload: GoogleReviewsPayload | null,
): GoogleReviewsPayload {
  if (birthdayReviews.length === 0 && !googlePayload) {
    return EMPTY_PAYLOAD;
  }

  if (birthdayReviews.length === 0 && googlePayload) {
    return googlePayload;
  }

  if (!googlePayload || googlePayload.reviews.length === 0) {
    return {
      placeName: 'Salón Andreas',
      rating: 5,
      totalReviews: birthdayReviews.length,
      googleMapsUrl: googlePayload?.googleMapsUrl ?? DEFAULT_MAPS_URL,
      reviews: birthdayReviews,
      source: 'birthday_club',
    };
  }

  const merged = [...birthdayReviews, ...googlePayload.reviews];

  return {
    placeName: googlePayload.placeName,
    rating: googlePayload.rating,
    totalReviews: googlePayload.totalReviews + birthdayReviews.length,
    googleMapsUrl: googlePayload.googleMapsUrl,
    reviews: merged,
    source: 'mixed',
  };
}

/** Reseñas públicas: Club Tu Cumpleaños (reales) + Google Business si está configurado. */
export async function getGoogleReviews(): Promise<GoogleReviewsPayload> {
  const [birthdayReviews, googlePayload] = await Promise.all([
    getBirthdayClubPublicReviews(),
    fetchGoogleReviews(),
  ]);

  return mergeReviews(birthdayReviews, googlePayload);
}

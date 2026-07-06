'use client';

import { useState } from 'react';

/** Logos oficiales — mismos PNG que apps/clientes/assets/social/ */

const SOCIAL_PNG = {
  instagram: '/images/social/Instagram.png',
  facebook: '/images/social/Facebook.png',
  whatsapp: '/images/social/WhatsApp.png',
} as const;

export type SocialBrand = keyof typeof SOCIAL_PNG | 'tiktok';

function InstagramFallback({ size }: { size: number }) {
  const r = size * 0.28;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx={r} fill="#E1306C" />
      <rect
        x="7"
        y="7"
        width="10"
        height="10"
        rx="2.5"
        fill="none"
        stroke="#FFF"
        strokeWidth="1.75"
      />
      <circle cx="17.2" cy="6.8" r="1.2" fill="#FFF" />
    </svg>
  );
}

function FacebookFallback({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="5" fill="#1877F2" />
      <path
        fill="#FFF"
        d="M14.5 8.5h-2c-.55 0-1 .45-1 1v2h3l-.5 2.5H11.5V19h-2.5v-5H8v-2.5h1.5V9.5c0-1.66 1.34-3 3-3h2v2Z"
      />
    </svg>
  );
}

function WhatsAppFallback({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="5.5" fill="#25D366" />
      <path
        fill="#FFF"
        d="M12 5.5c-3.59 0-6.5 2.91-6.5 6.5 0 1.15.3 2.26.87 3.24L5.5 18.5l3.42-.9a6.44 6.44 0 0 0 3.08.78c3.59 0 6.5-2.91 6.5-6.5S15.59 5.5 12 5.5Zm0 11.5a5.02 5.02 0 0 1-2.56-.7l-.18-.11-2.03.53.54-1.98-.12-.19a5.02 5.02 0 0 1-.77-2.68c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5Z"
      />
    </svg>
  );
}

function TikTokLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="footer-tiktok" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#25F4EE" />
          <stop offset="100%" stopColor="#FE2C55" />
        </linearGradient>
      </defs>
      <path
        fill="url(#footer-tiktok)"
        d="M16.6 5.82a4.28 4.28 0 0 1-1.03-2.82h-3.1v12.6a2.6 2.6 0 0 1-2.6 2.5 2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 3.4-2.47V7.9a5.7 5.7 0 0 0-.8-.06 5.7 5.7 0 1 0 5.7 5.7V8.6a7.34 7.34 0 0 0 4.3 1.38V6.87a4.28 4.28 0 0 1-3.27-1.05Z"
      />
    </svg>
  );
}

const FALLBACKS = {
  instagram: InstagramFallback,
  facebook: FacebookFallback,
  whatsapp: WhatsAppFallback,
} as const;

export function SocialLogo({
  brand,
  size = 28,
  className = '',
}: {
  brand: SocialBrand;
  size?: number;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (brand === 'tiktok') {
    return (
      <span className={`inline-flex shrink-0 ${className}`}>
        <TikTokLogo size={size} />
      </span>
    );
  }

  const Fallback = FALLBACKS[brand];

  if (imgFailed) {
    return (
      <span className={`inline-flex shrink-0 ${className}`}>
        <Fallback size={size} />
      </span>
    );
  }

  return (
    <span className={`inline-flex shrink-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SOCIAL_PNG[brand]}
        alt=""
        width={size}
        height={size}
        className="object-contain"
        style={{ width: size, height: size }}
        aria-hidden
        onError={() => setImgFailed(true)}
      />
    </span>
  );
}

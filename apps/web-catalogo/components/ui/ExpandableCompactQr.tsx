'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export function ExpandableCompactQr({
  src,
  srcLarge,
  alt,
  hint = 'Escanealo en salón',
  subtitle,
  size = 88,
  largeSize = 280,
  showHint = true,
}: {
  src: string;
  srcLarge?: string;
  alt: string;
  hint?: string;
  subtitle?: string;
  size?: number;
  largeSize?: number;
  showHint?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const largeSrc = srcLarge || src;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 flex-col items-center justify-center rounded-lg px-2 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        aria-label="Ampliar código QR"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="rounded-lg bg-white p-1"
        />
        {showHint ? (
          <p className="mt-1 max-w-[7rem] text-center text-[10px] leading-tight text-muted">
            {hint}
          </p>
        ) : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex max-w-sm flex-col items-center rounded-2xl border border-border bg-charcoal p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="absolute right-3 top-3 rounded-full border border-border p-1.5 text-muted transition-colors hover:text-cream"
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={largeSrc}
              alt={alt}
              width={largeSize}
              height={largeSize}
              className="rounded-xl bg-white p-2"
            />
            {subtitle ? (
              <p className="mt-4 font-medium tracking-[0.15em] text-cream">{subtitle}</p>
            ) : null}
            <p className="mt-2 max-w-xs text-center text-sm text-muted">{hint}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

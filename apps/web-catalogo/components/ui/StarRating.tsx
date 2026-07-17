'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';

/** Estrellas de solo lectura. */
export function StarRatingDisplay({
  value,
  count,
  size = 16,
}: {
  value: number | null;
  count?: number;
  size?: number;
}) {
  const rating = value ?? 0;
  return (
    <div className="flex items-center gap-1.5" aria-label={`${rating} de 5`}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            width={size}
            height={size}
            className={
              i <= Math.round(rating) ? 'text-gold' : 'text-border'
            }
            fill={i <= Math.round(rating) ? '#D4AF37' : 'transparent'}
          />
        ))}
      </div>
      {typeof count === 'number' && (
        <span className="text-xs text-muted">
          {rating ? rating.toFixed(1) : '—'} ({count})
        </span>
      )}
    </div>
  );
}

/** Estrellas interactivas para el formulario de reseña. */
export function StarRatingInput({
  value,
  onChange,
  size = 28,
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onClick={() => onChange(i)}
          onMouseEnter={() => !disabled && setHover(i)}
          onMouseLeave={() => setHover(0)}
          aria-label={`${i} estrella${i > 1 ? 's' : ''}`}
          className="p-0.5 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          <Star
            width={size}
            height={size}
            className={i <= active ? 'text-gold' : 'text-border'}
            fill={i <= active ? '#D4AF37' : 'transparent'}
          />
        </button>
      ))}
    </div>
  );
}

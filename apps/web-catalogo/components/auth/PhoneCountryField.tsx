'use client';

import { Phone } from 'lucide-react';
import {
  type ClientAuthCountry,
  countryDialLabel,
  localDigitsMaxLength,
} from '@/lib/phone/clientAuthPhone';

const COUNTRY_OPTIONS: { value: ClientAuthCountry; label: string }[] = [
  { value: 'gt', label: 'Guatemala' },
  { value: 'us_ca', label: 'EE.UU. / Canadá' },
];

export function PhoneCountryField({
  country,
  localDigits,
  onCountryChange,
  onLocalDigitsChange,
  disabled = false,
  placeholder,
}: {
  country: ClientAuthCountry;
  localDigits: string;
  onCountryChange: (country: ClientAuthCountry) => void;
  onLocalDigitsChange: (digits: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const maxLen = localDigitsMaxLength(country);
  const dial = countryDialLabel(country);

  return (
    <div className="space-y-2">
      <select
        value={country}
        onChange={(e) => onCountryChange(e.target.value as ClientAuthCountry)}
        disabled={disabled}
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-gold disabled:opacity-60"
        aria-label="País del teléfono"
      >
        {COUNTRY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-3">
        <span className="shrink-0 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground">
          {dial}
        </span>
        <div className="relative min-w-0 flex-1">
          <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="tel"
            inputMode="numeric"
            value={localDigits}
            onChange={(e) =>
              onLocalDigitsChange(
                e.target.value.replace(/\D/g, '').slice(0, maxLen),
              )
            }
            disabled={disabled}
            placeholder={
              placeholder ??
              (country === 'gt' ? '1234 5678' : '555 123 4567')
            }
            autoComplete="tel-national"
            className="w-full rounded-xl border border-border bg-surface py-3 pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted focus:border-gold disabled:opacity-60"
          />
        </div>
      </div>
    </div>
  );
}

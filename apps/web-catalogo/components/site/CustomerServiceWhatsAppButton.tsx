import { Phone } from 'lucide-react';
import { SocialLogo } from '@/components/site/SocialLogos';
import { SALON_CONTACT } from '@/lib/salonContact';

type CustomerServiceWhatsAppButtonProps = {
  href?: string;
  className?: string;
  variant?: 'whatsapp' | 'phone';
  size?: 'default' | 'compact';
};

export function CustomerServiceWhatsAppButton({
  href,
  className = '',
  variant = 'whatsapp',
  size = 'default',
}: CustomerServiceWhatsAppButtonProps) {
  const isPhone = variant === 'phone';
  const isCompact = size === 'compact';
  const linkHref =
    href ?? (isPhone ? SALON_CONTACT.telUrl : SALON_CONTACT.customerServiceWhatsAppUrl);

  const baseClass = isCompact
    ? 'inline-flex items-center gap-2 rounded-lg border border-gold/20 bg-transparent px-2.5 py-1.5 text-[10px] font-light uppercase tracking-[0.1em] text-muted transition-colors hover:border-gold/35 hover:text-gold'
    : 'inline-flex flex-col items-center justify-center gap-1 rounded-full border border-gold/50 bg-gold/10 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-gold transition-colors hover:bg-gold hover:text-charcoal';

  return (
    <a
      href={linkHref}
      {...(isPhone ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      className={`${baseClass} ${className}`.trim()}
    >
      {isCompact ? (
        <>
          {isPhone ? (
            <Phone className="h-3.5 w-3.5 shrink-0 text-[#25D366]" strokeWidth={2} />
          ) : (
            <SocialLogo brand="whatsapp" size={14} />
          )}
          <span>Atención al Cliente</span>
          <span className="text-[9px] tracking-[0.12em] text-gold/75">
            {SALON_CONTACT.telefonoLabel}
          </span>
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-2">
            {isPhone ? (
              <Phone className="h-4 w-4 text-[#25D366]" strokeWidth={2} />
            ) : (
              <SocialLogo brand="whatsapp" size={16} />
            )}
            Atención al Cliente
          </span>
          <span className="text-[10px] tracking-[0.14em]">{SALON_CONTACT.telefonoLabel}</span>
        </>
      )}
    </a>
  );
}

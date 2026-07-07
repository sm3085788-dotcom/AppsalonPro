import { BRAND_LOGOS } from '@/lib/data/brandLogos';

export function BrandMarquee() {
  return (
    <section className="relative overflow-hidden border-y border-black/10 bg-white py-2 sm:py-2.5">
      <div className="marquee gap-12 sm:gap-14">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex shrink-0 items-center gap-12 pr-12 sm:gap-14 sm:pr-14">
            {BRAND_LOGOS.map((brand) => (
              <div
                key={`${i}-${brand.src}`}
                className="flex shrink-0 items-center gap-12 sm:gap-14"
              >
                <img
                  src={brand.src}
                  alt={brand.name}
                  width={brand.width}
                  height={brand.height}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="h-[2.97rem] w-auto max-w-none object-contain [backface-visibility:hidden] [transform:translateZ(0)] sm:h-[3.78rem] md:h-[4.05rem]"
                />
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-neutral-400 sm:h-2.5 sm:w-2.5"
                  aria-hidden
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

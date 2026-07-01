export function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-12 border-b border-border pb-8">
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <h1 className="text-balance text-4xl font-light tracking-tight text-cream sm:text-5xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-muted">
          {subtitle}
        </p>
      )}
    </div>
  );
}

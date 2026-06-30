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
    <div className="mb-10">
      {eyebrow && (
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-gold">
          {eyebrow}
        </p>
      )}
      <h1 className="text-3xl font-light text-cream sm:text-4xl">{title}</h1>
      {subtitle && (
        <p className="mt-2 max-w-2xl text-sm text-muted">{subtitle}</p>
      )}
    </div>
  );
}

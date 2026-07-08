import Link from 'next/link';

import { Mail, MapPin } from 'lucide-react';
import { SocialLogo, type SocialBrand } from '@/components/site/SocialLogos';
import { CustomerServiceWhatsAppButton } from '@/components/site/CustomerServiceWhatsAppButton';
import { branchGoogleMapsUrl } from '@/lib/geo/mapsLinks';
import { buildWhatsAppCustomerUrl, SALON_CONTACT } from '@/lib/salonContact';

import type { Branch } from '@/lib/types/db';

const SOCIALS: { label: string; href: string; brand: SocialBrand }[] = [
  { label: 'Instagram', href: 'https://instagram.com/appsalonpro', brand: 'instagram' },
  { label: 'WhatsApp', href: SALON_CONTACT.whatsappUrl, brand: 'whatsapp' },
  { label: 'Facebook', href: 'https://facebook.com/appsalonpro', brand: 'facebook' },
  { label: 'TikTok', href: 'https://tiktok.com', brand: 'tiktok' },
];



const FALLBACK_BRANCH = {

  nombre: 'Sucursal Principal',

  direccion: 'Guastatoya, El Progreso',

};



export function SiteFooter({ branches = [] }: { branches?: Branch[] }) {

  const locationItems =
    branches.length > 0
      ? branches.filter(
          (b) => !/zona\s*15|rancho\s*el\s*progreso/i.test(`${b.nombre} ${b.direccion ?? ''}`),
        )
      : [{ id: 'fallback', ...FALLBACK_BRANCH, codigo: '', es_matriz: true, activa: true, telefono: null, created_at: '' }];



  return (

    <footer className="mt-2 border-t border-border">

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:px-8">

        <div className="lg:col-span-5">

          <div className="flex items-center gap-3">

            {/* eslint-disable-next-line @next/next/no-img-element */}

            <img

              src="/images/logo-andreas-transparent.png"

              alt="Andreas · AppSalon Pro"

              className="h-11 w-11 object-contain"

            />

            <span className="text-[15px] font-light tracking-[0.32em] text-cream">

              APPSALON <span className="text-gold">PRO</span>

            </span>

          </div>

          <p className="mt-5 max-w-xs text-sm font-light leading-relaxed text-muted">

            En Salón Andreas encontrás belleza de autor. Reserva tu cita,

            descubre productos premium y vive una experiencia hecha a tu medida.

          </p>



          <div className="mt-7 flex items-center gap-4">

            {SOCIALS.map((s) => (

              <a

                key={s.label}

                href={s.href}

                target="_blank"

                rel="noopener noreferrer"

                aria-label={s.label}

                className="opacity-90 transition-opacity hover:opacity-100"

              >

                <SocialLogo brand={s.brand} size={28} />

              </a>

            ))}

          </div>

        </div>



        <div className="text-sm lg:col-span-3 lg:col-start-7">

          <h4 className="eyebrow mb-5">Explorar</h4>

          <ul className="space-y-3 font-light text-muted">

            <li>

              <Link href="/servicios" className="transition-colors hover:text-cream">

                Servicios

              </Link>

            </li>

            <li>

              <Link href="/productos" className="transition-colors hover:text-cream">

                Productos

              </Link>

            </li>

            <li>

              <Link href="/reservar" className="transition-colors hover:text-cream">

                Reservar cita

              </Link>

            </li>

            <li>

              <Link href="/membresias" className="transition-colors hover:text-cream">

                Membresías

              </Link>

            </li>

          </ul>

        </div>



        <div className="text-sm lg:col-span-3">

          <h4 className="eyebrow mb-5">Contacto</h4>

          <ul className="space-y-3 font-light text-muted">

            <li>

              <a

                href="mailto:Andreassalon1998@gmail.com"

                className="flex items-start gap-3 transition-colors hover:text-cream"

              >

                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />

                Andreassalon1998@gmail.com

              </a>

            </li>

            {locationItems.map((branch) => {

              const mapsUrl = branchGoogleMapsUrl(branch);

              const label =
                branch.direccion?.trim() ||
                (branch.id === 'fallback'
                  ? 'Guastatoya, El Progreso'
                  : `${branch.nombre}, Guatemala`);

              return (

                <li key={branch.id}>

                  <a

                    href={mapsUrl}

                    target="_blank"

                    rel="noopener noreferrer"

                    aria-label={`${branch.nombre} · Abrir en Google Maps`}

                    className="group flex items-start gap-3 transition-colors hover:text-cream"

                  >

                    <MapPin

                      className="mt-0.5 h-4 w-4 shrink-0 text-gold transition-colors group-hover:text-gold-soft"

                      strokeWidth={1.5}

                    />

                    <span>

                      {branch.nombre}

                      <br />

                      {label}

                      <span className="mt-1 hidden text-[11px] text-gold/80 group-hover:block">

                        Ver en Google Maps

                      </span>

                    </span>

                  </a>

                </li>

              );

            })}

            <li className="pt-2">
              <CustomerServiceWhatsAppButton
                href={buildWhatsAppCustomerUrl('general')}
                size="compact"
              />
            </li>
          </ul>

        </div>

      </div>

      <div className="border-t border-border py-8 text-center text-xs font-light tracking-wide text-muted">

        © {new Date().getFullYear()} AppSalon Pro

      </div>

    </footer>

  );

}


import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad | AppSalon Pro",
  description:
    "Política de privacidad de AppSalon Pro (aplicaciones y sitio web).",
};

const contactEmail =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contacto@ejemplo.com";

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2C2C2C]">
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="text-sm font-light text-[#D4AF37] hover:underline"
          >
            ← Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-light tracking-wide sm:text-4xl">
          Política de privacidad
        </h1>
        <p className="mt-2 text-sm text-[#6B6B6B]">
          Última actualización: 6 de mayo de 2026
        </p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-[#404040] [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-normal [&_h2]:text-[#2C2C2C] [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
          <p>
            Esta política describe cómo{" "}
            <strong>AppSalon Pro</strong> (en adelante, &quot;nosotros&quot;)
            trata la información cuando usas nuestras aplicaciones móviles
            (por ejemplo, la app para clientes), nuestro sitio web y los
            servicios asociados (en conjunto, los &quot;Servicios&quot;).
          </p>

          <section>
            <h2>1. Responsable</h2>
            <p>
              Responsable del tratamiento: <strong>AppSalon Pro</strong>. Para
              cualquier consulta sobre privacidad:{" "}
              <a
                className="text-[#D4AF37] underline-offset-2 hover:underline"
                href={`mailto:${contactEmail}`}
              >
                {contactEmail}
              </a>
              .
            </p>
          </section>

          <section>
            <h2>2. Datos que podemos tratar</h2>
            <ul>
              <li>
                <strong>Datos de cuenta y autenticación</strong> si la app
                permite registro o inicio de sesión (por ejemplo, correo
                electrónico, identificador de usuario).
              </li>
              <li>
                <strong>Datos que tú nos facilitas</strong> al reservar citas,
                completar formularios o contactar (nombre, teléfono, mensajes,
                preferencias).
              </li>
              <li>
                <strong>Datos generados al usar el Servicio</strong> (por
                ejemplo, citas, historial de uso básico necesario para la
                gestión del negocio, según la funcionalidad activa).
              </li>
              <li>
                <strong>Campos que implican datos de salud especial</strong>:
                si en el futuro registra información clínicamente sensible, se
                aplicarán requisitos adicionales y se actualizará esta
                política.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. Permisos del dispositivo (app móvil)</h2>
            <p>
              Según cómo esté configurada la app en tu dispositivo, podría
              solicitarse acceso a funciones como cámara, galería/fotos,
              micrófono, ubicación, calendario o notificaciones. Solo se usarán
              cuando resulte necesario para la funcionalidad correspondiente y de
              forma acorde a esta política y a la información mostrada en la
              tienda de aplicaciones y en la propia app.
            </p>
          </section>

          <section>
            <h2>4. Finalidades</h2>
            <ul>
              <li>Prestar los Servicios (gestión de citas, cliente-salón).</li>
              <li>Seguridad, prevención del fraude y soporte.</li>
              <li>
                Cumplir obligaciones legales cuando proceda (por ejemplo,
                trazabilidad básica de incidencias si aplica).
              </li>
              <li>
                Notificaciones relacionadas con tu uso del Servicio cuando
                hayas dado el consentimiento pertinente del dispositivo/sistema.
              </li>
            </ul>
          </section>

          <section>
            <h2>5. Proveedores (encargados del tratamiento)</h2>
            <p>
              Utilizamos infraestructura y servicios de terceros para operar el
              Servicio. En particular, parte de los datos puede almacenarse y
              procesarse a través de{" "}
              <strong>Supabase</strong> (base de datos/autenticación alojada en
              sus servidores según su configuración contractual y su política de
              privacidad). También podemos utilizar servicios de alojamiento web
              para el sitio (por ejemplo, proveedores tipo Vercel).
            </p>
          </section>

          <section>
            <h2>6. Conservación</h2>
            <p>
              Conservamos la información el tiempo necesario para las finalidades
              anteriores, salvo obligación legal de conservarla por más tiempo.
              El período concreto puede depender del tipo de dato y del uso del
              Servicio.
            </p>
          </section>

          <section>
            <h2>7. Seguridad</h2>
            <p>
              Aplicamos medidas razonables (técnicas y organizativas) para
              proteger la información. Ningún método de transmisión o
              almacenamiento es 100&nbsp;% seguro.
            </p>
          </section>

          <section>
            <h2>8. Tus derechos</h2>
            <p>
              Puedes solicitarnos acceso, rectificación, supresión,
              limitación, oposición o portabilidad cuando corresponda según la
              legislación aplicable en tu país/región. Para ejercerlos, escribe
              a{" "}
              <a
                className="text-[#D4AF37] underline-offset-2 hover:underline"
                href={`mailto:${contactEmail}`}
              >
                {contactEmail}
              </a>
              .
            </p>
          </section>

          <section>
            <h2>9. Menores</h2>
            <p>
              Los Servicios no están dirigidos a menores de 13 años (o la edad
              mínima aplicable en tu jurisdicción). Si crees que un menor nos ha
              proporcionado datos personales, contacta con nosotros y
              actuaremos con diligencia razonable conforme a la ley.
            </p>
          </section>

          <section>
            <h2>10. Cambios</h2>
            <p>
              Podemos actualizar esta política. La fecha de &quot;Última
              actualización&quot; figurará arriba. Para cambios sustanciales,
              podremos informarte por medios adicionales si la ley lo exige.
            </p>
          </section>

          <section className="rounded-lg border border-amber-100 bg-white/80 p-4 text-sm text-[#5C5C5C]">
            <p>
              <strong>Aviso importante:</strong> este documento es una base
              orientativa y no constituye asesoramiento jurídico. Debes
              revisarlo con un profesional según tu país, sector y el diseño
              final de tu app (cookies, analítica, marketing, etc.).
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-white py-8 text-center text-sm text-[#9A9A9A]">
        <Link href="/" className="text-[#D4AF37] hover:underline">
          Inicio
        </Link>
      </footer>
    </div>
  );
}

/** Botones de descarga App Store / Google Play con logos de marca a color (Req 9). */
export function AppStoreButtons() {
  return (
    <div className="flex flex-wrap gap-3">
      {/* App Store */}
      <a
        href="#"
        aria-label="Descárgala en la App Store"
        className="flex items-center gap-3 rounded-xl bg-white px-5 py-2.5 shadow-sm ring-1 ring-black/5 transition-transform hover:-translate-y-0.5"
      >
        <AppleLogo className="h-7 w-7" />
        <span className="text-left leading-tight">
          <span className="block text-[10px] font-light text-neutral-500">
            Descárgala en
          </span>
          <span className="block text-sm font-semibold text-neutral-900">
            App Store
          </span>
        </span>
      </a>

      {/* Google Play */}
      <a
        href="#"
        aria-label="Disponible en Google Play"
        className="flex items-center gap-3 rounded-xl bg-white px-5 py-2.5 shadow-sm ring-1 ring-black/5 transition-transform hover:-translate-y-0.5"
      >
        <GooglePlayLogo className="h-6 w-6" />
        <span className="text-left leading-tight">
          <span className="block text-[10px] font-light text-neutral-500">
            Disponible en
          </span>
          <span className="block text-sm font-semibold text-neutral-900">
            Google Play
          </span>
        </span>
      </a>
    </div>
  );
}

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 384 512"
      fill="#000000"
      aria-hidden="true"
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function GooglePlayLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      aria-hidden="true"
    >
      {/* Izquierda (azul) */}
      <path
        fill="#00A0FF"
        d="M25.3 35.3C25.3 19.2 34 6.8 47 0l256.6 256L47 512c-13-6.8-21.7-19.2-21.7-35.3V35.3z"
      />
      {/* Superior (verde) */}
      <path
        fill="#00F076"
        d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z"
      />
      {/* Derecha (amarillo) */}
      <path
        fill="#FFBD00"
        d="M472.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8z"
      />
      {/* Inferior (rojo) */}
      <path
        fill="#FF3A44"
        d="M104.6 499l220.7-221.3 60.1 60.1L104.6 499z"
      />
    </svg>
  );
}

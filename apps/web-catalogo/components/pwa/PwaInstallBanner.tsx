'use client';

import { useCallback, useEffect, useState } from 'react';
import { Share, X, Download } from 'lucide-react';

const DISMISS_KEY = 'andreas-pwa-install-dismissed';
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type BannerMode = 'android-install' | 'android-manual' | 'ios';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  );
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  );
}

function isAndroidDevice(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

function isDismissedRecently(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < DISMISS_MS;
  } catch {
    return false;
  }
}

function dismissBanner() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<BannerMode | null>(null);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const close = useCallback(() => {
    dismissBanner();
    setVisible(false);
  }, []);

  useEffect(() => {
    if (isStandalone() || isDismissedRecently()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setMode('android-install');
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    if (isIosDevice()) {
      setMode('ios');
      setVisible(true);
      return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    }

    if (isAndroidDevice()) {
      let promptReceived = false;
      const wrappedInstall = (event: Event) => {
        promptReceived = true;
        onBeforeInstall(event);
      };
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.addEventListener('beforeinstallprompt', wrappedInstall);

      const timer = window.setTimeout(() => {
        if (promptReceived) return;
        setMode('android-manual');
        setVisible(true);
      }, 2500);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', wrappedInstall);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const onInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible || !mode) return null;

  const title =
    mode === 'ios'
      ? 'Acceso directo en tu iPhone'
      : mode === 'android-install'
        ? 'Instalar Andreas en tu teléfono'
        : 'Añadir Andreas a inicio';

  const description =
    mode === 'ios' ? (
      <>
        Tocá <Share className="mx-0.5 inline h-3.5 w-3.5 align-text-bottom" aria-hidden />{' '}
        <strong className="font-normal text-cream">Compartir</strong> y elegí{' '}
        <strong className="font-normal text-cream">Añadir a pantalla de inicio</strong>. Abrí
        desde el icono para ver la web sin barra del navegador.
      </>
    ) : mode === 'android-install' ? (
      <>Instalá la app web con un toque. Reservas y catálogo desde tu pantalla de inicio.</>
    ) : (
      <>
        En Chrome: menú <strong className="font-normal text-cream">⋮</strong> →{' '}
        <strong className="font-normal text-cream">Instalar aplicación</strong> o{' '}
        <strong className="font-normal text-cream">Añadir a pantalla de inicio</strong>.
      </>
    );

  return (
    <div
      role="region"
      aria-label="Instalar aplicación web"
      className="fixed bottom-0 left-0 right-0 z-[95] border-t border-gold/30 bg-charcoal/95 px-4 py-3 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-7xl gap-3 sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pwa/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="hidden h-11 w-11 shrink-0 rounded-xl border border-gold/25 sm:block"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-cream">{title}</p>
          <p className="mt-0.5 text-xs font-light leading-snug text-muted">{description}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          {mode === 'android-install' ? (
            <button
              type="button"
              onClick={() => void onInstallClick()}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gold/50 bg-gold/15 px-3.5 py-2 text-xs font-medium text-gold-soft transition-colors hover:bg-gold/25"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Instalar
            </button>
          ) : null}
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar aviso de instalación"
            className="inline-flex items-center justify-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-light text-muted transition-colors hover:border-border-strong hover:text-cream"
          >
            <X className="h-3.5 w-3.5 sm:hidden" aria-hidden />
            <span>Ahora no</span>
          </button>
        </div>
      </div>
    </div>
  );
}

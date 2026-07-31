import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { BranchProvider } from "@/components/branch/BranchContext";
import { TiendaCartProvider } from "@/components/tienda/TiendaCartContext";
import { SupabaseConfigProvider } from "@/components/supabase/SupabaseConfigProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ConfigStatusBanner } from "@/components/site/ConfigStatusBanner";
import { HashScrollSync } from "@/components/site/HashScrollSync";
import { listBranches } from "@/lib/data/branches";
import { resolveSelectedBranchId } from "@/lib/data/selectedBranch";
import { getCurrentUser, getClienteDisplayName } from "@/lib/auth";
import { getPublicSupabaseConfig } from "@/lib/supabase/public-config";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AppSalon Pro | Salones de belleza de lujo",
  description:
    "Reserva citas, compra productos premium y vive la experiencia AppSalon Pro. Descarga la app.",
  applicationName: "Andreas",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Andreas",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0e0e0f",
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [branches, user, supabaseConfig] = await Promise.all([
    listBranches(),
    getCurrentUser(),
    Promise.resolve(getPublicSupabaseConfig()),
  ]);

  const [initialBranchId, displayName] = await Promise.all([
    resolveSelectedBranchId(branches),
    user ? getClienteDisplayName(user.id, user) : Promise.resolve(null),
  ]);

  return (
    <html
      lang="es"
      className={`${inter.variable} ${cormorant.variable} ${geistMono.variable} h-full bg-background antialiased`}
    >
      <body className="relative flex min-h-full flex-col bg-background text-foreground">
        <ServiceWorkerRegistration />
        {/* Glows editoriales de fondo */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-background"
        >
          <div className="glow-gold absolute -top-56 left-1/2 h-[820px] w-[820px] -translate-x-1/2 opacity-45 blur-[100px]" />
          <div className="glow-cream absolute top-1/3 -right-56 h-[640px] w-[640px] opacity-35 blur-[100px]" />
          <div className="glow-gold absolute bottom-0 -left-56 h-[600px] w-[600px] opacity-30 blur-[100px]" />
        </div>
        <SupabaseConfigProvider config={supabaseConfig}>
          <BranchProvider
            branches={branches}
            initialBranchId={initialBranchId}
          >
            <TiendaCartProvider>
              <ConfigStatusBanner configured={supabaseConfig.configured} />
              <HashScrollSync />
              <SiteHeader
                isLoggedIn={!!user}
                userEmail={user?.email ?? null}
                userDisplayName={displayName}
              />
              <main className="flex-1 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] md:pt-[calc(4.5rem+env(safe-area-inset-top,0px))]">
                {children}
              </main>
              <SiteFooter branches={branches} />
            </TiendaCartProvider>
          </BranchProvider>
        </SupabaseConfigProvider>
      </body>
    </html>
  );
}

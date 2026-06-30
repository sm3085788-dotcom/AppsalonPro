import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BranchProvider } from "@/components/branch/BranchContext";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { listBranches } from "@/lib/data/branches";
import { getCurrentUser } from "@/lib/auth";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AppSalon Pro | Salones de belleza de lujo",
  description:
    "Reserva citas, compra productos premium y vive la experiencia AppSalon Pro. Descarga la app.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [branches, user] = await Promise.all([listBranches(), getCurrentUser()]);

  return (
    <html
      lang="es"
      className={`${inter.variable} ${geistMono.variable} h-full bg-background antialiased`}
    >
      <body className="relative flex min-h-full flex-col bg-background text-foreground">
        {/* Glows editoriales de fondo */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        >
          <div className="glow-gold absolute -top-40 left-1/2 h-[640px] w-[640px] -translate-x-1/2" />
          <div className="glow-cream absolute top-1/3 -right-40 h-[520px] w-[520px]" />
          <div className="glow-gold absolute bottom-0 -left-40 h-[480px] w-[480px] opacity-70" />
        </div>
        <BranchProvider branches={branches}>
          <SiteHeader userEmail={user?.email ?? null} />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </BranchProvider>
      </body>
    </html>
  );
}

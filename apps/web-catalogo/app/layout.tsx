import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BranchProvider } from "@/components/branch/BranchContext";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { listBranches } from "@/lib/data/branches";
import { getCurrentUser } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <BranchProvider branches={branches}>
          <SiteHeader userEmail={user?.email ?? null} />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </BranchProvider>
      </body>
    </html>
  );
}

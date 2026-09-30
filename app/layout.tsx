import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "LINCE — Combo OSINT público",
  description:
    "Busca em fontes públicas, organizador de arquivos locais e dashboard com filtros e histórico.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <div className="noise fixed inset-0 pointer-events-none opacity-60" />
        <div className="relative z-10 min-h-screen">
          <SiteHeader />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}

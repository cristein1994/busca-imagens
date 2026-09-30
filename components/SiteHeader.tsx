"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Início" },
  { href: "/buscar", label: "Busca pública" },
  { href: "/arquivos", label: "Arquivos locais" },
  { href: "/dashboard", label: "Dashboard" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-900/10 bg-mist-50/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-display text-2xl font-extrabold tracking-tight text-ink-900 transition group-hover:text-tide-600">
            LINCE
          </span>
          <span className="hidden text-xs uppercase tracking-[0.18em] text-ink-600 sm:inline">
            combo OSINT
          </span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-ink-900 text-mist-50"
                    : "text-ink-700 hover:bg-ink-900/5 hover:text-ink-950"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

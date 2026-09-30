import Link from "next/link";

const modules = [
  {
    href: "/buscar",
    title: "Busca pública",
    copy: "Wikipedia, DuckDuckGo Instant Answer e Open Library — só surface web.",
  },
  {
    href: "/arquivos",
    title: "Arquivos locais",
    copy: "Importe CSV, JSON ou TXT, tague e pesquise no navegador.",
  },
  {
    href: "/dashboard",
    title: "Dashboard",
    copy: "Filtros por fonte/tag/data e histórico unificado das consultas.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative min-h-[88vh] overflow-hidden">
        <div className="mesh absolute inset-0 animate-pulse-soft" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-ink-950/20" />
        <div
          className="pointer-events-none absolute -left-20 top-24 h-64 w-64 rounded-full bg-tide-400/30 blur-3xl animate-drift"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-0 bottom-10 h-72 w-72 rounded-full bg-ember-400/25 blur-3xl animate-drift"
          style={{ animationDelay: "2s" }}
          aria-hidden
        />

        <div className="relative mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-end px-4 pb-16 pt-24 sm:px-6 sm:pb-20">
          <p className="animate-rise font-display text-5xl font-extrabold tracking-tight text-white sm:text-7xl md:text-8xl">
            LINCE
          </p>
          <h1 className="mt-4 max-w-2xl animate-rise font-display text-2xl font-semibold leading-tight text-mist-100 sm:text-3xl" style={{ animationDelay: "80ms" }}>
            Três ferramentas, uma mesa de trabalho OSINT pública.
          </h1>
          <p className="mt-4 max-w-xl animate-rise text-base leading-relaxed text-mist-200/90 sm:text-lg" style={{ animationDelay: "140ms" }}>
            Busca em fontes abertas, organização de arquivos locais e dashboard com histórico —
            sem Deep Web, Tor ou mercados.
          </p>
          <div className="mt-8 flex animate-rise flex-wrap gap-3" style={{ animationDelay: "200ms" }}>
            <Link
              href="/buscar"
              className="rounded-md bg-ember-500 px-5 py-3 text-sm font-semibold text-ink-950 transition hover:bg-ember-400"
            >
              Abrir busca pública
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-white/35 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Ver dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-bold text-ink-900">O combo</h2>
        <p className="mt-2 max-w-2xl text-ink-700">
          Um fluxo contínuo: pesquisar na surface web, importar o que você já tem, e filtrar tudo no
          painel.
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {modules.map((mod, i) => (
            <Link
              key={mod.href}
              href={mod.href}
              className="group animate-rise border-t border-ink-900/15 pt-5 transition hover:border-tide-500"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <h3 className="font-display text-xl font-semibold text-ink-900 group-hover:text-tide-600">
                {mod.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{mod.copy}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

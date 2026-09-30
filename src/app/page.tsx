import { Suspense } from "react";
import { CnpjSearch } from "@/components/CnpjSearch";

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 80% 55% at 12% 18%, #b8d4c4 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 88% 8%, #d5e4da 0%, transparent 50%),
            linear-gradient(165deg, #f4f7f3 0%, #e7efe9 42%, #dce8e0 100%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[min(92vh,720px)] opacity-[0.18]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2314201c' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 pb-20 pt-10 sm:px-10 lg:px-12">
        <header className="animate-rise flex items-baseline justify-between gap-4">
          <p className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            RAIZ
          </p>
          <p className="text-right text-xs font-medium uppercase tracking-[0.18em] text-ink-soft/60">
            Consulta CNPJ
          </p>
        </header>

        <section className="mt-16 flex flex-1 flex-col justify-center gap-10 pb-16 sm:mt-24 sm:gap-12">
          <div className="max-w-2xl space-y-5">
            <h1 className="animate-rise-delay font-[family-name:var(--font-display)] text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              A raiz do cadastro, em um número.
            </h1>
            <div className="animate-pulse-line h-1 w-40 bg-leaf" />
            <p className="animate-rise-delay max-w-lg text-lg leading-relaxed text-ink-soft sm:text-xl">
              Digite um CNPJ e veja razão social, situação, CNAE, endereço e
              quadro societário — dados públicos, sem cadastro.
            </p>
          </div>

          <Suspense
            fallback={
              <p className="text-sm text-ink-soft/70">Carregando consulta…</p>
            }
          >
            <CnpjSearch />
          </Suspense>
        </section>

        <footer className="mt-auto border-t border-line/80 pt-6 text-sm text-ink-soft/65">
          Fonte: BrasilAPI / Minha Receita / Receita Federal (dados abertos). Uso
          responsável.
        </footer>
      </div>
    </main>
  );
}

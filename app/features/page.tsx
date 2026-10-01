import { SiteNav } from "@/app/components/SiteNav";
import { GRABIFY_FEATURES } from "@/lib/utils";

export default function FeaturesPage() {
  return (
    <main className="shell">
      <div className="brand">
        <strong>PULSE</strong>
        <span>features</span>
      </div>
      <SiteNav />
      <div className="hero-copy">
        <h1>Lista completa do que o PULSE pode registrar</h1>
        <p>
          Reprodução do conjunto de logs do Grabify. Itens com * exigem Smart
          Logger e suporte do dispositivo/navegador.
        </p>
      </div>
      <div className="feature-grid">
        {GRABIFY_FEATURES.map((f) => (
          <article className="feature-card" key={f.title}>
            <h3>
              {f.title}
              {f.smart ? " *" : ""}
            </h3>
            <p>{f.body}</p>
          </article>
        ))}
      </div>
    </main>
  );
}

import { CreateLinkForm } from "./components/CreateLinkForm";
import { SiteNav } from "./components/SiteNav";

export default function HomePage() {
  return (
    <main className="shell">
      <div className="brand">
        <strong>PULSE</strong>
        <span>grabify-complete</span>
      </div>
      <SiteNav />

      <div className="hero-copy">
        <h1>Reprodução completa: link, pixel, smart logger, dashboard 24/7.</h1>
        <p>
          Crie o monitor, envie o link ou embuta o pixel de imagem, e acompanhe
          IP, geo, ISP, VPN/Tor, browser/OS e sinais do Smart Logger em tempo
          real.
        </p>
      </div>

      <CreateLinkForm />

      <div className="steps">
        <div>
          <strong>1. Criar</strong>
          <p>Gera link `/l/…`, pixel `/i/…` e dashboard com token.</p>
        </div>
        <div>
          <strong>2. Enviar</strong>
          <p>Quem abre o link ou carrega a imagem é registrado.</p>
        </div>
        <div>
          <strong>3. Monitorar</strong>
          <p>Dashboard SSE fica online e atualiza sozinho.</p>
        </div>
      </div>

      <p className="hint">
        24/7: `docker compose up -d --build` com `NEXT_PUBLIC_BASE_URL` no VPS.
      </p>
    </main>
  );
}

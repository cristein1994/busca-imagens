import { CreateLinkForm } from "./components/CreateLinkForm";

export default function HomePage() {
  return (
    <main className="shell">
      <div className="brand">
        <strong>PULSE</strong>
        <span>link monitor</span>
      </div>

      <div className="hero-copy">
        <h1>Sempre online. Clique chega, log aparece.</h1>
        <p>
          Crie um link de rastreio, envie para quem quiser, e deixe o dashboard
          aberto — novos acessos entram em tempo real com IP, localização
          aproximada, ISP e user-agent.
        </p>
      </div>

      <CreateLinkForm />

      <p className="hint">
        Para ficar 24/7: rode com Docker (`docker compose up -d`) em um VPS.
        O SQLite em `/data` guarda histórico mesmo após reinício.
      </p>
    </main>
  );
}

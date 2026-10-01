import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveMonitor, type Visit } from "@/app/components/LiveMonitor";
import { SiteNav } from "@/app/components/SiteNav";
import { countVisits, getLinkByCode, getVisits, visitToJson } from "@/lib/db";
import { baseUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function DashboardPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { token = "" } = await searchParams;
  const link = getLinkByCode(code);

  if (!link) notFound();
  if (!token || token !== link.token) {
    return (
      <main className="shell">
        <div className="brand">
          <strong>PULSE</strong>
          <span>acesso negado</span>
        </div>
        <div className="panel">
          <p className="error" style={{ margin: 0 }}>
            Token inválido. Use o link completo do dashboard gerado na criação.
          </p>
          <p className="hint">
            <Link href="/">Voltar e criar outro link</Link>
          </p>
        </div>
      </main>
    );
  }

  const visits = getVisits(code, 0).map(visitToJson) as Visit[];
  const trackUrl = `${baseUrl()}/l/${link.code}`;
  const imageUrl = `${baseUrl()}/i/${link.code}`;

  return (
    <main className="shell">
      <div className="brand">
        <strong>PULSE</strong>
        <span>ao vivo</span>
      </div>
      <SiteNav />

      <div className="hero-copy">
        <h1>{link.label || `Monitor ${link.code}`}</h1>
        <p>
          Destino: <a href={link.target_url}>{link.target_url}</a>
          <br />
          Link: <code>{trackUrl}</code>
          <br />
          Pixel: <code>{imageUrl}</code>
          <br />
          Smart Logger: {link.smart_logger === 1 ? "ligado" : "desligado"}
        </p>
      </div>

      <LiveMonitor
        code={link.code}
        token={link.token}
        initialTotal={countVisits(code)}
        initialVisits={visits}
      />

      <p className="hint">
        Deixe esta página aberta. Novos cliques (link ou imagem) aparecem sem
        recarregar.
      </p>
    </main>
  );
}

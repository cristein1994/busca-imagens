import type { CnpjCompany } from "@/lib/types";
import { formatCnpj, onlyDigits } from "@/lib/cnpj";

function money(n?: number) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

function dateBr(iso?: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-ink-soft/55">
        {label}
      </dt>
      <dd className="mt-1 break-words text-base text-ink">{value || "—"}</dd>
    </div>
  );
}

export function CompanyResult({ company }: { company: CnpjCompany }) {
  const digits = onlyDigits(company.cnpj || "");
  const phone1 =
    company.ddd_telefone_1 && company.telefone_1
      ? `(${company.ddd_telefone_1}) ${company.telefone_1}`
      : null;
  const phone2 =
    company.ddd_telefone_2 && company.telefone_2
      ? `(${company.ddd_telefone_2}) ${company.telefone_2}`
      : null;

  const address = [
    [company.logradouro, company.numero].filter(Boolean).join(", "),
    company.complemento,
    company.bairro,
    [company.municipio, company.uf].filter(Boolean).join(" / "),
    company.cep ? `CEP ${company.cep}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const situacao =
    company.descricao_situacao_cadastral ||
    String(company.situacao_cadastral ?? "—");

  return (
    <section aria-labelledby="resultado-titulo" className="space-y-10">
      <header className="space-y-3 border-t border-line pt-8">
        <p className="font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.22em] text-leaf">
          Resultado
        </p>
        <h2
          id="resultado-titulo"
          className="font-[family-name:var(--font-display)] text-3xl font-extrabold leading-tight text-ink sm:text-4xl"
        >
          {company.razao_social || "Razão social indisponível"}
        </h2>
        {company.nome_fantasia ? (
          <p className="text-lg text-ink-soft">{company.nome_fantasia}</p>
        ) : null}
        <p className="font-mono text-sm tracking-wide text-ink-soft/80">
          {formatCnpj(digits)}
        </p>
      </header>

      <dl className="grid gap-6 sm:grid-cols-2">
        <Field label="Situação cadastral" value={situacao} />
        <Field
          label="Data da situação"
          value={dateBr(company.data_situacao_cadastral)}
        />
        <Field
          label="Início das atividades"
          value={dateBr(company.data_inicio_atividade)}
        />
        <Field
          label="Natureza jurídica"
          value={
            company.descricao_natureza_juridica ||
            company.natureza_juridica ||
            undefined
          }
        />
        <Field
          label="Porte"
          value={company.descricao_porte || company.porte || undefined}
        />
        <Field label="Capital social" value={money(company.capital_social)} />
        <Field
          label="CNAE principal"
          value={
            company.cnae_fiscal
              ? `${company.cnae_fiscal} — ${company.cnae_fiscal_descricao || ""}`
              : company.cnae_fiscal_descricao
          }
        />
        <Field label="E-mail" value={company.email} />
        <Field label="Telefone" value={phone1 || undefined} />
        <Field label="Telefone 2" value={phone2 || undefined} />
        <div className="sm:col-span-2">
          <Field label="Endereço" value={address || undefined} />
        </div>
      </dl>

      {company.cnaes_secundarios && company.cnaes_secundarios.length > 0 ? (
        <div className="space-y-3 border-t border-line pt-8">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
            CNAEs secundários
          </h3>
          <ul className="space-y-2 text-sm text-ink-soft">
            {company.cnaes_secundarios.slice(0, 12).map((c, i) => (
              <li key={`${c.codigo}-${i}`} className="border-b border-line/70 py-2">
                <span className="font-mono text-ink/70">{c.codigo}</span>
                {c.descricao ? ` — ${c.descricao}` : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {company.qsa && company.qsa.length > 0 ? (
        <div className="space-y-3 border-t border-line pt-8">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
            QSA — quadro de sócios e administradores
          </h3>
          <ul className="divide-y divide-line">
            {company.qsa.map((s, i) => (
              <li key={`${s.nome_socio}-${i}`} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <p className="font-semibold text-ink">{s.nome_socio || "—"}</p>
                  <p className="text-sm text-ink-soft">
                    {s.qualificacao_socio || "Qualificação não informada"}
                    {s.cnpj_cpf_do_socio
                      ? ` · doc. ${s.cnpj_cpf_do_socio}`
                      : null}
                  </p>
                </div>
                <p className="shrink-0 text-sm text-ink-soft/70">
                  Desde {dateBr(s.data_entrada_sociedade)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

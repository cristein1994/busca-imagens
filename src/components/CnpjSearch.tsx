"use client";

import { FormEvent, useId, useState, useTransition } from "react";
import { formatCnpj, isValidCnpj, onlyDigits } from "@/lib/cnpj";
import type { CnpjCompany, LookupResult } from "@/lib/types";
import { CompanyResult } from "@/components/CompanyResult";

export function CnpjSearch() {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<CnpjCompany | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const digits = onlyDigits(value);
    setError(null);

    if (!isValidCnpj(digits)) {
      setCompany(null);
      setError("CNPJ inválido. Digite os 14 dígitos com verificadores corretos.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/cnpj/${digits}`);
        const json = (await res.json()) as LookupResult;
        if (!json.ok) {
          setCompany(null);
          setError(json.error);
          return;
        }
        setCompany(json.data);
      } catch {
        setCompany(null);
        setError("Não foi possível consultar agora. Tente de novo.");
      }
    });
  }

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={onSubmit} className="animate-rise-late space-y-3">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-ink-soft/80"
        >
          Número do CNPJ
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <input
            id={inputId}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder="00.000.000/0000-00"
            value={value}
            onChange={(e) => setValue(formatCnpj(e.target.value))}
            className="min-h-14 flex-1 border-b-2 border-ink/25 bg-transparent px-1 text-2xl tracking-wide text-ink outline-none transition placeholder:text-ink/25 focus:border-leaf"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-err` : undefined}
          />
          <button
            type="submit"
            disabled={pending}
            className="min-h-14 shrink-0 bg-leaf px-8 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-leaf-bright disabled:cursor-wait disabled:opacity-70"
          >
            {pending ? "Consultando…" : "Consultar"}
          </button>
        </div>
        {error ? (
          <p id={`${inputId}-err`} role="alert" className="text-sm text-red-800">
            {error}
          </p>
        ) : (
          <p className="text-sm text-ink-soft/70">
            Dados públicos da Receita Federal via BrasilAPI. Sem login.
          </p>
        )}
      </form>

      {company ? (
        <div className="mt-14 animate-rise">
          <CompanyResult company={company} />
        </div>
      ) : null}
    </div>
  );
}

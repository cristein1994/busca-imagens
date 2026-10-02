'use client'

import { useMemo, useState } from 'react'
import { LABFERT_PUBLIC, LABFERT_ROSTER, LABFERT_UNITS } from '@/data/labfert-roster'
import { peopleFrom, rosterBrief, rosterSummary, type RosterPerson } from '@/lib/roster'

function matches(person: RosterPerson, query: string): boolean {
  if (!query) return true
  const haystack = [person.fullName, person.title, person.location, person.email, person.band, person.unit ?? '']
    .join(' ')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
  return haystack.includes(query.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase())
}

export function Roster() {
  const [query, setQuery] = useState('')
  const summary = useMemo(() => rosterSummary(LABFERT_ROSTER), [])
  const people = useMemo(() => peopleFrom(LABFERT_ROSTER), [])
  const visible = people.filter((person) => matches(person, query.trim()))

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-8">
      <header className="border-b border-[var(--line)] pb-5">
        <p className="font-mono text-xs tracking-[0.22em] text-[var(--brass)]">AGENTENGINE</p>
        <h1 className="mt-1 font-serif text-3xl text-[var(--text)] md:text-4xl">Quadro LabFert</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text)]">{rosterBrief(LABFERT_ROSTER)}</p>
        <p className="mt-3 max-w-3xl text-sm text-[var(--muted)]">
          A {LABFERT_PUBLIC.name} publica no próprio site a fundação em {LABFERT_PUBLIC.founded}, em {LABFERT_PUBLIC.hq}, por {LABFERT_PUBLIC.founder}, com ensaios de fertilizantes, solo, tecido vegetal, água e efluentes. Caixa geral:{' '}
          <a href={`mailto:${LABFERT_PUBLIC.inbox}`}>{LABFERT_PUBLIC.inbox}</a>. Os e-mails individuais abaixo são só os que já estavam na planilha.
        </p>
        <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">
          <a href={LABFERT_PUBLIC.site}>labfert.agr.br</a>
          {' · '}
          <a href={LABFERT_PUBLIC.about}>sobre</a>
          {' · '}
          <a href={LABFERT_PUBLIC.units}>unidades</a>
          {' · '}
          <a href={LABFERT_PUBLIC.contact}>contato</a>
        </p>
      </header>

      <section className="mt-5 grid gap-3 md:grid-cols-4">
        <Stat label="Linhas" value={String(summary.rows)} />
        <Stat label="Nomes únicos" value={String(summary.uniqueNames)} />
        <Stat label="E-mails na planilha" value={String(summary.emails)} />
        <Stat label="Na unidade publicada" value={`${summary.onUnit}/${summary.rows}`} />
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <article className="border border-[var(--line)] bg-[var(--panel)] p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-[var(--brass)]">Por cidade</h2>
          <ul className="mt-2 grid gap-1 text-sm">
            {summary.cities.map(([city, count]) => (
              <li key={city} className="flex justify-between gap-3">
                <span>{city}</span>
                <span className="font-mono text-[var(--muted)]">{count}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="border border-[var(--line)] bg-[var(--panel)] p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-[var(--brass)]">Unidades no site</h2>
          <ul className="mt-2 grid gap-2 text-sm">
            {LABFERT_UNITS.map((unit) => (
              <li key={unit.city}>
                <span className="text-[var(--text)]">{unit.city}, {unit.state}</span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">{unit.address} · {unit.phone}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {summary.duplicates.length > 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Nomes repetidos na planilha, com links diferentes: {summary.duplicates.join(', ')}. As duas linhas foram mantidas.
        </p>
      ) : null}

      <label className="mt-5 block">
        <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">Filtrar quadro</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="nome, cargo, cidade ou e-mail"
          className="w-full border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-[var(--text)] outline-none focus:border-[var(--brass)]"
        />
      </label>

      <p className="mt-3 font-mono text-xs text-[var(--muted)]">{visible.length} de {people.length} linhas</p>

      <ul className="mt-3 grid gap-3">
        {visible.map((person) => (
          <li key={person.linkedinUrl} className="border border-[var(--line)] px-3 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base">{person.fullName}</h2>
              <span className="font-mono text-[11px] text-[var(--brass)]">{person.band}</span>
            </div>
            <p className="mt-1 text-sm">{person.title}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {person.location}
              {person.unit ? ` · unidade publicada: ${person.unit}` : ' · cidade fora da lista de unidades do site'}
            </p>
            <p className="mt-1 text-sm">
              {person.email ? <a href={`mailto:${person.email}`}>{person.email}</a> : <span className="text-[var(--muted)]">E-mail não veio na planilha</span>}
            </p>
            <p className="mt-1 break-all font-mono text-[11px]">
              <a href={person.linkedinUrl} target="_blank" rel="noreferrer">{person.linkedinUrl}</a>
              <span className="text-[var(--muted)]"> · {person.linkedinKind === 'token' ? 'identificador interno' : 'slug público'}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--line)] bg-[var(--panel)] px-3 py-3">
      <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-serif text-2xl text-[var(--text)]">{value}</p>
    </div>
  )
}

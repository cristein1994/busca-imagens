import type { ModuleResult } from '@/lib/types'

const STATUS_LABEL = {
  ok: 'Com dados',
  empty: 'Vazio',
  error: 'Falha',
} as const

const STATUS_CLASS = {
  ok: 'border-acid/50 text-acid',
  empty: 'border-line text-mist',
  error: 'border-rose/60 text-rose',
} as const

function Cell({ value }: { value: string }) {
  if (/^https?:\/\//i.test(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="break-all text-aqua underline-offset-2 hover:underline">
        {value}
      </a>
    )
  }
  if (value.startsWith('mailto:')) {
    return (
      <a href={value} className="break-all text-aqua underline-offset-2 hover:underline">
        {value.replace(/^mailto:/, '')}
      </a>
    )
  }
  return <span className="break-words">{value}</span>
}

export function ModuleCard({ module }: { module: ModuleResult }) {
  return (
    <article className={`border border-line bg-panel/90 p-4 ${module.table ? 'lg:col-span-2' : ''}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist">{module.source}</p>
          <h3 className="text-lg text-foam">{module.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${STATUS_CLASS[module.status]}`}>
            {STATUS_LABEL[module.status]}
          </span>
          <span className="font-mono text-[10px] text-mist">{module.ms} ms</span>
        </div>
      </header>
      <p className="mt-3 text-sm text-mist">{module.summary}</p>
      {module.error ? <p className="mt-2 font-mono text-xs text-rose">{module.error}</p> : null}
      {module.facts.length > 0 ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {module.facts.map((item) => (
            <div key={`${item.label}-${item.value}`} className="min-w-0 border-t border-line/70 pt-2">
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-mist">{item.label}</dt>
              <dd className="mt-1 font-mono text-sm text-foam">
                {item.href ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className="break-all text-aqua underline-offset-2 hover:underline">
                    {item.value}
                  </a>
                ) : (
                  <span className="break-words">{item.value}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {module.table && module.table.rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left font-mono text-xs">
            <thead>
              <tr>
                {module.table.columns.map((column) => (
                  <th key={column} className="border-b border-line px-2 py-2 font-medium text-mist">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {module.table.rows.map((row, index) => (
                <tr key={`${module.id}-${index}`} className="align-top">
                  {row.map((cell, cellIndex) => (
                    <td key={`${index}-${cellIndex}`} className="border-b border-line/50 px-2 py-2 text-foam">
                      <Cell value={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </article>
  )
}

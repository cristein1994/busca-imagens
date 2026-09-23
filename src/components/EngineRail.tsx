import type { EngineInfo, EngineReport, TorStatus } from '../../shared/contracts.ts'

type Props = {
  engines: EngineInfo[]
  reports: EngineReport[]
  enabled: Set<string>
  tor: TorStatus | null
  probing: boolean
  onToggle: (id: string) => void
  onSetGroup: (network: EngineInfo['network'], on: boolean) => void
  onProbe: () => void
}

const viaLabel: Record<EngineReport['via'], string> = {
  direct: 'direto',
  tor: 'via Tor',
  'clearnet-fallback': 'espelho clearnet',
  skipped: 'sem Tor',
}

export function EngineRail(props: Props) {
  const reports = new Map(props.reports.map((report) => [report.id, report]))
  const surface = props.engines.filter((engine) => engine.network === 'surface')
  const onion = props.engines.filter((engine) => engine.network === 'onion')
  const answered = props.reports.filter((report) => report.ok && report.resultCount > 0).length
  const failed = props.reports.filter((report) => !report.ok).length

  return (
    <section className="rail" aria-label="Motores">
      <header className="rail-head">
        <div>
          <h2>Motores</h2>
          <p>
            {surface.length} surface · {onion.length} onion
            {props.reports.length > 0 ? ` · ${answered} com resultados · ${failed} falharam ou estão fora` : ''}
          </p>
        </div>
        <div className="tor-box">
          <span className={props.tor?.ok ? 'lamp on' : 'lamp'} />
          <p>{props.tor?.detail ?? 'Checando Tor…'}</p>
          <button type="button" onClick={props.onProbe} disabled={props.probing}>
            {props.probing ? 'Provando .onion…' : 'Provar circuito'}
          </button>
        </div>
      </header>

      <Group
        title="Surface web"
        engines={surface}
        reports={reports}
        enabled={props.enabled}
        onToggle={props.onToggle}
        onAll={() => props.onSetGroup('surface', true)}
        onNone={() => props.onSetGroup('surface', false)}
      />
      <Group
        title="Deep web / .onion"
        engines={onion}
        reports={reports}
        enabled={props.enabled}
        onToggle={props.onToggle}
        onAll={() => props.onSetGroup('onion', true)}
        onNone={() => props.onSetGroup('onion', false)}
      />
    </section>
  )
}

function Group(props: {
  title: string
  engines: EngineInfo[]
  reports: Map<string, EngineReport>
  enabled: Set<string>
  onToggle: (id: string) => void
  onAll: () => void
  onNone: () => void
}) {
  return (
    <div className="group">
      <div className="group-head">
        <h3>{props.title}</h3>
        <div className="row">
          <button type="button" onClick={props.onAll}>Marcar</button>
          <button type="button" onClick={props.onNone}>Limpar</button>
        </div>
      </div>
      <ul className="pills">
        {props.engines.map((engine) => {
          const report = props.reports.get(engine.id)
          const state = !report ? 'idle' : report.ok && report.resultCount > 0 ? 'hit' : report.ok ? 'empty' : 'fail'
          return (
            <li key={engine.id} className={`pill ${state}`} title={engine.indexes}>
              <label>
                <input
                  type="checkbox"
                  checked={props.enabled.has(engine.id)}
                  onChange={() => props.onToggle(engine.id)}
                />
                <span>{engine.name}</span>
              </label>
              <small>
                {report
                  ? `${report.resultCount} · ${viaLabel[report.via]}${report.error ? ` · ${report.error}` : ''}`
                  : engine.group}
              </small>
              {report?.searchUrl ? (
                <a href={report.searchUrl} target="_blank" rel="noreferrer">Abrir busca</a>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

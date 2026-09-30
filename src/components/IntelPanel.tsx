import type { CarrierHint, PhoneIntel } from '../lib/types'

type Props = {
  intel: PhoneIntel
  carrier: CarrierHint | null
  carrierLoading: boolean
  onSave: () => void
  onCopy: () => void
  onExport: () => void
  onCarrier: () => void
}

export function IntelPanel({
  intel,
  carrier,
  carrierLoading,
  onSave,
  onCopy,
  onExport,
  onCarrier,
}: Props) {
  return (
    <section className="panel" aria-label="Inteligência do número">
      <h2>Ficha do número</h2>
      <div className="badgeRow">
        <span className={intel.valid ? 'badge badgeOk' : 'badge badgeWarn'}>
          {intel.valid ? 'Válido (E.164)' : 'Inválido / incompleto'}
        </span>
        <span className={intel.possible ? 'badge badgeOk' : 'badge badgeMuted'}>
          {intel.possible ? 'Possível' : 'Impossível'}
        </span>
        <span className="badge badgeMuted">{intel.kindLabel}</span>
      </div>

      <dl className="facts">
        <div>
          <dt>E.164</dt>
          <dd>{intel.e164}</dd>
        </div>
        <div>
          <dt>Internacional</dt>
          <dd>{intel.international}</dd>
        </div>
        <div>
          <dt>Nacional</dt>
          <dd>{intel.national}</dd>
        </div>
        <div>
          <dt>País</dt>
          <dd>
            {intel.countryName}
            {intel.countryCallingCode ? ` · +${intel.countryCallingCode}` : ''}
          </dd>
        </div>
        <div>
          <dt>URI</dt>
          <dd>
            <a href={intel.uri}>{intel.uri}</a>
          </dd>
        </div>
        {intel.br ? (
          <>
            <div>
              <dt>DDD</dt>
              <dd>
                {intel.br.ddd} · {intel.br.state} · {intel.br.region}
              </dd>
            </div>
            <div>
              <dt>Cidades</dt>
              <dd>{intel.br.cities.join(', ')}</dd>
            </div>
          </>
        ) : null}
      </dl>

      <div className="carrierBox">
        <strong>Operadora (API opcional)</strong>
        {carrierLoading ? <p className="empty">Consultando AbstractAPI…</p> : null}
        {!carrierLoading && !carrier ? (
          <p className="empty">
            Opcional. Configure <code>VITE_ABSTRACT_PHONE_KEY</code> ou clique em consultar.
          </p>
        ) : null}
        {!carrierLoading && carrier ? (
          <dl className="facts" style={{ marginTop: '0.55rem' }}>
            <div>
              <dt>Fonte</dt>
              <dd>{carrier.source}</dd>
            </div>
            <div>
              <dt>Carrier</dt>
              <dd>{carrier.carrier || '—'}</dd>
            </div>
            <div>
              <dt>Tipo linha</dt>
              <dd>{carrier.lineType || '—'}</dd>
            </div>
            <div>
              <dt>Local</dt>
              <dd>{carrier.location || '—'}</dd>
            </div>
            {carrier.error ? (
              <div>
                <dt>Nota</dt>
                <dd>{carrier.error}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>

      <div className="actions">
        <button type="button" className="ghostBtn" onClick={onSave}>
          Guardar caso
        </button>
        <button type="button" className="ghostBtn" onClick={onCopy}>
          Copiar E.164
        </button>
        <button type="button" className="ghostBtn" onClick={onExport}>
          Exportar MD
        </button>
        <button type="button" className="ghostBtn" onClick={onCarrier} disabled={carrierLoading}>
          Consultar carrier
        </button>
      </div>
    </section>
  )
}

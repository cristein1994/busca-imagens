import { useEffect, useMemo, useState } from 'react'
import { bag, phoneGroups, phones, sources, type PhoneModel } from '../data/catalog'
import { assess, parseMm, withCase, type Assessment, type Axis } from '../lib/fit'
import { formatCount, formatMm } from '../lib/format'
import { BagDiagram } from './BagDiagram'
import styles from './FitStudio.module.css'

const storageKey = 'pponak-fit-v1'
const slackMm = 4

const axisLabel: Record<Axis, string> = {
  widthMm: 'Largura',
  heightMm: 'Altura',
  depthMm: 'Profundidade',
}

type Saved = {
  phoneId: string
  colorId: string
  casePerSide: number
  pocketW: string
  pocketH: string
  pocketD: string
}

function readSaved(): Partial<Saved> {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<Saved>
    return parsed ?? {}
  } catch {
    return {}
  }
}

function phoneBox(phone: PhoneModel) {
  return {
    widthMm: phone.widthMm,
    heightMm: phone.heightMm,
    depthMm: phone.cameraDepthMm ?? phone.depthMm,
  }
}

function statusCopy(status: Assessment['status']): string {
  if (status === 'fits') return 'Cabe com folga'
  if (status === 'tight') return 'Cabe justo'
  if (status === 'no') return 'Não cabe'
  return 'Falta medida'
}

function Meter({ result }: { result: Assessment['axes'][number] }) {
  const ratio =
    result.spaceMm && result.spaceMm > 0 ? Math.min(result.itemMm / result.spaceMm, 1) : 0
  const detail =
    result.marginMm == null
      ? formatMm(result.itemMm)
      : `${formatMm(result.itemMm)} de ${formatMm(result.spaceMm ?? 0)} · sobra ${formatCount(result.marginMm)}`

  return (
    <div className={styles.meter}>
      <div className={styles.meterHead}>
        <span>{axisLabel[result.axis]}</span>
        <strong>{detail}</strong>
      </div>
      {result.spaceMm != null && (
        <div className={styles.track} aria-hidden="true">
          <div
            className={`${styles.fill} ${styles[result.status]}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function FitStudio() {
  const saved = useMemo(() => readSaved(), [])
  const [phoneId, setPhoneId] = useState(
    () => phones.find((phone) => phone.id === saved.phoneId)?.id ?? 'iphone-18-pro-max',
  )
  const [colorId, setColorId] = useState(
    () => bag.colors.find((color) => color.id === saved.colorId)?.id ?? 'tan',
  )
  const [casePerSide, setCasePerSide] = useState(() =>
    typeof saved.casePerSide === 'number' && saved.casePerSide >= 0 && saved.casePerSide <= 3
      ? saved.casePerSide
      : 0,
  )
  const [pocketW, setPocketW] = useState(saved.pocketW ?? '')
  const [pocketH, setPocketH] = useState(saved.pocketH ?? '')
  const [pocketD, setPocketD] = useState(saved.pocketD ?? '')

  useEffect(() => {
    const next: Saved = { phoneId, colorId, casePerSide, pocketW, pocketH, pocketD }
    localStorage.setItem(storageKey, JSON.stringify(next))
  }, [phoneId, colorId, casePerSide, pocketW, pocketH, pocketD])

  const phone = phones.find((item) => item.id === phoneId) ?? phones[1]
  const color = bag.colors.find((item) => item.id === colorId) ?? bag.colors[0]
  const sized = withCase(phoneBox(phone), casePerSide)

  const bagFit = assess(
    sized,
    { widthMm: bag.lengthMm, heightMm: bag.heightMm, depthMm: bag.depthMm },
    slackMm,
  )

  const parsedW = parseMm(pocketW)
  const parsedH = parseMm(pocketH)
  const parsedD = parseMm(pocketD)
  const pocketFit = assess(
    sized,
    {
      widthMm: parsedW.state === 'ok' ? parsedW.value : null,
      heightMm: parsedH.state === 'ok' ? parsedH.value : null,
      depthMm: parsedD.state === 'ok' ? parsedD.value : null,
    },
    slackMm,
  )

  const pocketReady = parsedW.state === 'ok' && parsedH.state === 'ok'
  const pocketStatus = pocketFit.status === 'no' || pocketReady ? pocketFit.status : 'unknown'
  const phoneFitsPocket =
    pocketFit.status === 'no' ? false : pocketReady && pocketFit.status !== 'unknown' ? true : null

  const widthShare = Math.round((sized.widthMm / bag.lengthMm) * 100)
  const heightShare = Math.round((sized.heightMm / bag.heightMm) * 100)

  return (
    <>
      <header className={styles.header}>
        <p className={styles.kicker}>ALDO · satchel</p>
        <h1 className={styles.brand}>Pponak</h1>
        <p className={styles.question}>O iPhone cabe?</p>
      </header>

      <fieldset className={styles.colors}>
        <legend>Cor da bolsa</legend>
        {bag.colors.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.colorBtn}
            aria-pressed={item.id === color.id}
            onClick={() => setColorId(item.id)}
          >
            <span className={styles.dot} style={{ background: item.leather[1] }} />
            {item.label}
          </button>
        ))}
      </fieldset>

      <BagDiagram
        color={color}
        bagWidthMm={bag.lengthMm}
        bagHeightMm={bag.heightMm}
        phoneWidthMm={sized.widthMm}
        phoneHeightMm={sized.heightMm}
        pocketWidthMm={parsedW.state === 'ok' ? parsedW.value : null}
        pocketHeightMm={parsedH.state === 'ok' ? parsedH.value : null}
        phoneFitsPocket={phoneFitsPocket}
      />

      <section className={styles.panel}>
        <h2>iPhone</h2>
        <label className={styles.field}>
          <span>Modelo</span>
          <select value={phone.id} onChange={(event) => setPhoneId(event.target.value)}>
            {phoneGroups.map((group) => (
              <optgroup key={group} label={group}>
                {phones
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <p className={styles.dims}>
          <strong>
            {formatCount(phone.heightMm)} × {formatCount(phone.widthMm)} × {formatCount(phone.depthMm)} mm
          </strong>
        </p>
        <p className={styles.sub}>
          Tela de {formatCount(phone.displayIn)} pol · {formatCount(phone.weightG)} g
          {phone.cameraDepthNote ? ` · ${phone.cameraDepthNote}` : ''}
        </p>

        <label className={`${styles.field} ${styles.slider}`}>
          <span>
            Capa, por lado: {casePerSide === 0 ? 'sem capa' : formatMm(casePerSide)}
          </span>
          <input
            type="range"
            min={0}
            max={3}
            step={0.5}
            value={casePerSide}
            onChange={(event) => setCasePerSide(Number(event.target.value))}
          />
        </label>
        {casePerSide > 0 && (
          <p className={styles.sub}>
            Com a capa: {formatCount(sized.heightMm)} × {formatCount(sized.widthMm)} ×{' '}
            {formatCount(sized.depthMm)} mm
          </p>
        )}
      </section>

      <section className={styles.panel} aria-live="polite">
        <h2>Corpo da bolsa</h2>
        <p className={`${styles.banner} ${styles[bagFit.status]}`}>{statusCopy(bagFit.status)}</p>
        <p className={styles.help}>
          Este {phone.name}
          {casePerSide > 0 ? ' com capa' : ''} ocupa cerca de {widthShare}% da largura e{' '}
          {heightShare}% da altura da frente. A folga mínima usada aqui é de {slackMm} mm.
        </p>
        {bagFit.axes.map((axis) => (
          <Meter key={axis.axis} result={axis} />
        ))}
        <p className={styles.fine}>
          Profundidade comparada com {phone.cameraDepthMm ? 'o relevo da câmera' : 'o corpo publicado pela Apple'}.
          O volume da câmera dos outros modelos não entra nessa conta.
        </p>
      </section>

      <section className={styles.panel}>
        <h2>Bolso de celular</h2>
        <p className={styles.help}>
          As fichas anunciam o bolso e não publicam a boca. Meça a abertura interna em milímetros.
        </p>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Largura</span>
            <input
              inputMode="decimal"
              value={pocketW}
              onChange={(event) => setPocketW(event.target.value)}
              placeholder="mm"
              aria-invalid={parsedW.state === 'invalid'}
            />
          </label>
          <label className={styles.field}>
            <span>Altura</span>
            <input
              inputMode="decimal"
              value={pocketH}
              onChange={(event) => setPocketH(event.target.value)}
              placeholder="mm"
              aria-invalid={parsedH.state === 'invalid'}
            />
          </label>
          <label className={styles.field}>
            <span>Profundidade, se medir</span>
            <input
              inputMode="decimal"
              value={pocketD}
              onChange={(event) => setPocketD(event.target.value)}
              placeholder="mm"
              aria-invalid={parsedD.state === 'invalid'}
            />
          </label>
        </div>
        {(parsedW.state === 'invalid' ||
          parsedH.state === 'invalid' ||
          parsedD.state === 'invalid') && (
          <p className={styles.error}>Use um número entre 0 e 2000, como 90 ou 90,5.</p>
        )}
        <p className={`${styles.banner} ${styles.pocketBanner} ${styles[pocketStatus]}`}>
          {statusCopy(pocketStatus)}
        </p>
        {pocketFit.axes.map((axis) => (
          <Meter key={axis.axis} result={axis} />
        ))}
        <button
          type="button"
          className={styles.ghost}
          onClick={() => {
            setPocketW('')
            setPocketH('')
            setPocketD('')
          }}
        >
          Limpar medidas
        </button>
      </section>

      <section className={styles.specs}>
        <h2>Ficha publicada</h2>
        <dl>
          <dt>Peça</dt>
          <dd>
            {bag.brand} {bag.name}
          </dd>
          <dt>Silhueta</dt>
          <dd>{bag.silhouette}</dd>
          <dt>Corpo</dt>
          <dd>44 × 50 × 22 cm</dd>
          <dt>Peso</dt>
          <dd>{bag.weightG} g</dd>
          <dt>Alça</dt>
          <dd>{formatMm(bag.handleMm)}</dd>
          <dt>Fecho</dt>
          <dd>{bag.closure}</dd>
          <dt>Exterior</dt>
          <dd>{bag.outer}</dd>
          <dt>Forro</dt>
          <dd>{bag.lining}</dd>
          <dt>Artigo</dt>
          <dd>{color.sku}</dd>
        </dl>
        <p className={styles.fine}>
          Também constam bolso de celular, bolsa interna separada e argola de chave. Este app não é da ALDO nem da Apple.
        </p>
      </section>

      <ul className={styles.sources}>
        {sources.map((source) => (
          <li key={source.href}>
            <a href={source.href} target="_blank" rel="noopener noreferrer">
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </>
  )
}

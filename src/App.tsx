import { useCallback, useState } from 'react'
import './App.css'
import { PhoneForm } from './components/PhoneForm'
import { IntelPanel } from './components/IntelPanel'
import { PortalLinks } from './components/PortalLinks'
import { CaseList } from './components/CaseList'
import { analyzePhone } from './lib/phone'
import { fetchCarrierHint } from './lib/carrier'
import {
  exportCaseMarkdown,
  listCases,
  saveCase,
} from './lib/cases'
import type { CarrierHint, PhoneIntel, SavedCase } from './lib/types'

export default function App() {
  const [query, setQuery] = useState('')
  const [formKey, setFormKey] = useState(0)
  const [intel, setIntel] = useState<PhoneIntel | null>(null)
  const [error, setError] = useState('')
  const [carrier, setCarrier] = useState<CarrierHint | null>(null)
  const [carrierLoading, setCarrierLoading] = useState(false)
  const [cases, setCases] = useState<SavedCase[]>(() => listCases())
  const [flash, setFlash] = useState('')

  const refreshCases = useCallback(() => {
    setCases(listCases())
  }, [])

  function showFlash(message: string) {
    setFlash(message)
    window.setTimeout(() => setFlash(''), 2200)
  }

  function runLookup(value: string) {
    setQuery(value)
    setCarrier(null)
    setError('')
    const result = analyzePhone(value)
    if ('error' in result) {
      setIntel(null)
      setError(result.error)
      return
    }
    setIntel(result)
  }

  async function handleCarrier() {
    if (!intel) return
    setCarrierLoading(true)
    const hint = await fetchCarrierHint(intel)
    setCarrier(hint)
    setCarrierLoading(false)
  }

  function handleSave() {
    if (!intel) return
    saveCase(intel)
    refreshCases()
    showFlash('Caso guardado no navegador.')
  }

  async function handleCopy() {
    if (!intel) return
    await navigator.clipboard.writeText(intel.e164)
    showFlash('E.164 copiado.')
  }

  async function handleExport() {
    if (!intel) return
    const temp: SavedCase = {
      id: 'tmp',
      title: intel.e164,
      phone: intel.raw,
      e164: intel.e164,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      snapshot: intel,
    }
    await navigator.clipboard.writeText(exportCaseMarkdown(temp))
    showFlash('Markdown copiado.')
  }

  return (
    <div className="shell">
      <header className="hero">
        <p className="brand">LINHA</p>
        <p className="tagline">
          Mesa OSINT para números de telefone — parse E.164, DDD brasileiro e
          portais públicos.
        </p>
        <p className="notice">
          Só fontes abertas: validação local, tabela ANATEL de DDD e links de
          busca. Não consulta assinante, breaches nem redes ocultas. Use só em
          investigações legítimas.
        </p>
      </header>

      <div className="desk">
        <PhoneForm key={formKey} onSubmit={runLookup} initial={query} />

        {flash ? (
          <p className="empty" role="status">
            {flash}
          </p>
        ) : null}

        {error ? (
          <div className="error" role="alert">
            {error}
          </div>
        ) : null}

        {intel ? (
          <div className="grid">
            <div>
              <IntelPanel
                intel={intel}
                carrier={carrier}
                carrierLoading={carrierLoading}
                onSave={handleSave}
                onCopy={() => void handleCopy()}
                onExport={() => void handleExport()}
                onCarrier={() => void handleCarrier()}
              />
            </div>
            <PortalLinks intel={intel} />
          </div>
        ) : null}

        <CaseList
          cases={cases}
          onChange={refreshCases}
          onOpen={(item) => {
            setQuery(item.e164)
            setFormKey((k) => k + 1)
            setIntel(item.snapshot)
            setError('')
            setCarrier(null)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      </div>

      <footer className="footer">
        <p>
          LINHA · OSINT telefone · dados processados no seu browser · carrier
          opcional via AbstractAPI
        </p>
      </footer>

      <style>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import styles from './App.module.css'
import type { Contact, WhatsAppGroup } from './types/group'
import { extractFromText, toCsv, toVcf, whatsappChatUrl } from './lib/phones'
import { loadGroups, saveGroups, uid } from './lib/storage'

type Tab = 'lista' | 'importar' | 'exportar' | 'info'

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [groups, setGroups] = useState<WhatsAppGroup[]>(() => loadGroups())
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const initial = loadGroups()
    return initial[0]?.id ?? null
  })
  const [tab, setTab] = useState<Tab>('lista')
  const [query, setQuery] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [banner, setBanner] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [manualName, setManualName] = useState('')

  useEffect(() => {
    saveGroups(groups)
  }, [groups])

  const effectiveSelectedId =
    selectedId && groups.some((g) => g.id === selectedId)
      ? selectedId
      : (groups[0]?.id ?? null)

  const selected = useMemo(
    () => groups.find((g) => g.id === effectiveSelectedId) ?? null,
    [groups, effectiveSelectedId],
  )

  const filteredContacts = useMemo(() => {
    if (!selected) return []
    const q = query.trim().toLowerCase()
    if (!q) return selected.contacts
    return selected.contacts.filter(
      (c) =>
        c.phone.toLowerCase().includes(q) ||
        c.e164.includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q),
    )
  }, [selected, query])

  function flash(msg: string) {
    setBanner(msg)
    window.setTimeout(() => setBanner(null), 4000)
  }

  function createGroup() {
    const name = newName.trim() || `Grupo ${groups.length + 1}`
    const now = new Date().toISOString()
    const group: WhatsAppGroup = {
      id: uid('grp'),
      name,
      description: '',
      inviteLink: '',
      contacts: [],
      createdAt: now,
      updatedAt: now,
    }
    setGroups((prev) => [group, ...prev])
    setSelectedId(group.id)
    setNewName('')
    setShowNewModal(false)
    setTab('importar')
    flash(`Grupo “${name}” criado. Cole a lista de números.`)
  }

  function updateSelected(patch: Partial<WhatsAppGroup>) {
    if (!selected) return
    setGroups((prev) =>
      prev.map((g) =>
        g.id === selected.id
          ? { ...g, ...patch, updatedAt: new Date().toISOString() }
          : g,
      ),
    )
  }

  function deleteGroup(id: string) {
    if (!confirm('Excluir este grupo e todos os números salvos nele?')) return
    setGroups((prev) => prev.filter((g) => g.id !== id))
  }

  function removeContact(contactId: string) {
    if (!selected) return
    updateSelected({
      contacts: selected.contacts.filter((c) => c.id !== contactId),
    })
  }

  function importPaste() {
    if (!selected) return
    const { items, ignored, duplicatesInBatch } = extractFromText(pasteText)
    if (items.length === 0) {
      flash('Nenhum número válido encontrado no texto.')
      return
    }

    const existing = new Set(selected.contacts.map((c) => c.e164))
    const now = new Date().toISOString()
    const added: Contact[] = []
    let skippedDup = duplicatesInBatch

    for (const item of items) {
      if (existing.has(item.e164)) {
        skippedDup += 1
        continue
      }
      existing.add(item.e164)
      added.push({
        id: uid('ct'),
        phone: item.phone,
        e164: item.e164,
        name: item.name,
        notes: item.notes,
        source: 'paste',
        addedAt: now,
      })
    }

    updateSelected({ contacts: [...selected.contacts, ...added] })
    setPasteText('')
    setTab('lista')
    flash(
      `${added.length} número(s) adicionados` +
        (skippedDup ? ` · ${skippedDup} duplicado(s) ignorados` : '') +
        (ignored.length ? ` · ${ignored.length} linha(s) sem telefone` : ''),
    )
  }

  function addManual() {
    if (!selected) return
    const { items } = extractFromText(manualPhone)
    if (items.length === 0) {
      flash('Telefone inválido.')
      return
    }
    const item = items[0]
    if (selected.contacts.some((c) => c.e164 === item.e164)) {
      flash('Este número já está na lista.')
      return
    }
    const contact: Contact = {
      id: uid('ct'),
      phone: item.phone,
      e164: item.e164,
      name: manualName.trim() || item.name,
      notes: '',
      source: 'manual',
      addedAt: new Date().toISOString(),
    }
    updateSelected({ contacts: [...selected.contacts, contact] })
    setManualPhone('')
    setManualName('')
    flash('Contato adicionado.')
  }

  function onCsvFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      setPasteText(text)
      setTab('importar')
      flash(`Arquivo “${file.name}” carregado. Revise e clique em Extrair números.`)
    }
    reader.readAsText(file)
  }

  function exportCsv() {
    if (!selected) return
    downloadFile(
      `${slug(selected.name)}-numeros.csv`,
      toCsv(selected.contacts),
      'text/csv;charset=utf-8',
    )
  }

  function exportJson() {
    if (!selected) return
    downloadFile(
      `${slug(selected.name)}-numeros.json`,
      JSON.stringify(selected, null, 2),
      'application/json',
    )
  }

  function exportVcf() {
    if (!selected) return
    downloadFile(
      `${slug(selected.name)}-contatos.vcf`,
      toVcf(selected.contacts),
      'text/vcard',
    )
  }

  async function copyNumbers() {
    if (!selected) return
    const text = selected.contacts.map((c) => c.e164).join('\n')
    await navigator.clipboard.writeText(text)
    flash('Números copiados (formato E.164).')
  }

  return (
    <div className={styles.shell}>
      <header className={styles.hero}>
        <h1 className={styles.brand}>GrupoLista</h1>
        <p className={styles.tagline}>
          Organize e baixe os números dos seus grupos do WhatsApp a partir de
          listas que você já tem — cole, importe CSV e exporte limpo.
        </p>
        <div className={styles.ctaRow}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setShowNewModal(true)}
          >
            Novo grupo
          </button>
          <label className={`${styles.btn} ${styles.btnGhost}`}>
            Importar CSV
            <input
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) {
                  if (!selected) setShowNewModal(true)
                  onCsvFile(f)
                }
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.panel}>
          <h2 className={styles.panelTitle}>Grupos</h2>
          {groups.length === 0 ? (
            <p className={styles.emptySide}>
              Nenhum grupo ainda. Crie um e cole a lista de participantes.
            </p>
          ) : (
            <ul className={styles.groupList}>
              {groups.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    className={`${styles.groupItem} ${
                      g.id === effectiveSelectedId ? styles.groupItemActive : ''
                    }`}
                    onClick={() => {
                      setSelectedId(g.id)
                      setTab('lista')
                    }}
                  >
                    <span className={styles.groupItemName}>{g.name}</span>
                    <span className={styles.groupItemMeta}>
                      {g.contacts.length} número
                      {g.contacts.length === 1 ? '' : 's'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
            style={{ marginTop: '0.75rem', width: '100%' }}
            onClick={() => setShowNewModal(true)}
          >
            + Adicionar grupo
          </button>
        </aside>

        <section className={styles.panel}>
          {!selected ? (
            <div className={styles.emptyMain}>
              <strong>Comece por um grupo</strong>
              Crie um grupo e cole os números (um por linha, CSV ou texto com
              telefones misturados).
            </div>
          ) : (
            <>
              <div className={styles.mainHead}>
                <div>
                  <h2>{selected.name}</h2>
                  <p>
                    Atualizado{' '}
                    {new Date(selected.updatedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                  onClick={() => deleteGroup(selected.id)}
                >
                  Excluir grupo
                </button>
              </div>

              <div className={styles.stats}>
                <div className={styles.stat}>
                  <strong>{selected.contacts.length}</strong>
                  <span>Números</span>
                </div>
                <div className={styles.stat}>
                  <strong>
                    {selected.contacts.filter((c) => c.name).length}
                  </strong>
                  <span>Com nome</span>
                </div>
                <div className={styles.stat}>
                  <strong>
                    {
                      new Set(
                        selected.contacts.map((c) =>
                          c.e164.replace(/\D/g, '').slice(0, 2),
                        ),
                      ).size
                    }
                  </strong>
                  <span>Países</span>
                </div>
              </div>

              <div className={styles.tabs}>
                {(
                  [
                    ['lista', 'Lista'],
                    ['importar', 'Importar'],
                    ['exportar', 'Baixar'],
                    ['info', 'Info'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {banner && <div className={styles.banner}>{banner}</div>}

              {tab === 'lista' && (
                <>
                  <div className={styles.toolbar}>
                    <input
                      className={styles.searchBox}
                      placeholder="Buscar número ou nome…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label>Adicionar manualmente</label>
                    <div className={styles.toolbar} style={{ marginBottom: 0 }}>
                      <input
                        className={styles.searchBox}
                        placeholder="Telefone"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                      />
                      <input
                        className={styles.searchBox}
                        placeholder="Nome (opcional)"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                      />
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                        onClick={addManual}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {filteredContacts.length === 0 ? (
                    <div className={styles.emptyMain}>
                      <strong>Lista vazia</strong>
                      Vá em Importar e cole os números do grupo.
                    </div>
                  ) : (
                    <div className={styles.tableWrap}>
                      <table>
                        <thead>
                          <tr>
                            <th>Telefone</th>
                            <th>Nome</th>
                            <th>Origem</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredContacts.map((c) => (
                            <tr key={c.id}>
                              <td className={styles.phoneMono}>{c.phone}</td>
                              <td>{c.name || '—'}</td>
                              <td>{c.source}</td>
                              <td>
                                <div className={styles.rowActions}>
                                  <a
                                    className={styles.linkBtn}
                                    href={whatsappChatUrl(c.e164)}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Abrir
                                  </a>
                                  <button
                                    type="button"
                                    className={`${styles.linkBtn} ${styles.linkBtnDanger}`}
                                    onClick={() => removeContact(c.id)}
                                  >
                                    Remover
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {tab === 'importar' && (
                <>
                  <p className={styles.hint}>
                    Cole a lista de participantes (texto do WhatsApp, planilha
                    colada, CSV ou um número por linha). O app extrai e
                    normaliza os telefones automaticamente.
                  </p>
                  <div className={styles.field}>
                    <label htmlFor="paste">Texto ou CSV</label>
                    <textarea
                      id="paste"
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder={`Exemplos:\n5511999990000\nMaria Silva: (11) 98888-7777\n+55 21 97777-6666\n\nOu CSV:\nphone,name\n11999990000,João`}
                    />
                  </div>
                  <div className={styles.ctaRow}>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={importPaste}
                      disabled={!pasteText.trim()}
                    >
                      Extrair números
                    </button>
                    <label className={`${styles.btn} ${styles.btnGhost}`}>
                      Escolher arquivo
                      <input
                        type="file"
                        accept=".csv,.txt,text/csv,text/plain"
                        hidden
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) onCsvFile(f)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                  <div className={`${styles.banner} ${styles.bannerWarn}`} style={{ marginTop: '1rem' }}>
                    Use apenas listas de grupos dos quais você faz parte ou
                    administra. Dados ficam só neste navegador (localStorage).
                  </div>
                </>
              )}

              {tab === 'exportar' && (
                <>
                  <p className={styles.hint}>
                    Baixe a lista limpa em CSV, JSON, vCard ou copie os números
                    para a área de transferência.
                  </p>
                  <div className={styles.ctaRow}>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={exportCsv}
                      disabled={selected.contacts.length === 0}
                    >
                      Baixar CSV
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnGhost}`}
                      onClick={exportJson}
                      disabled={selected.contacts.length === 0}
                    >
                      Baixar JSON
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnGhost}`}
                      onClick={exportVcf}
                      disabled={selected.contacts.length === 0}
                    >
                      Baixar vCard
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnGhost}`}
                      onClick={() => void copyNumbers()}
                      disabled={selected.contacts.length === 0}
                    >
                      Copiar números
                    </button>
                  </div>
                </>
              )}

              {tab === 'info' && (
                <>
                  <div className={styles.field}>
                    <label htmlFor="gname">Nome do grupo</label>
                    <input
                      id="gname"
                      value={selected.name}
                      onChange={(e) => updateSelected({ name: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="gdesc">Descrição / notas</label>
                    <textarea
                      id="gdesc"
                      style={{ fontFamily: 'inherit', minHeight: 100 }}
                      value={selected.description}
                      onChange={(e) =>
                        updateSelected({ description: e.target.value })
                      }
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="glink">Link de convite (opcional)</label>
                    <input
                      id="glink"
                      placeholder="https://chat.whatsapp.com/…"
                      value={selected.inviteLink}
                      onChange={(e) =>
                        updateSelected({ inviteLink: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>

      <p className={styles.footerNote}>
        GrupoLista não conecta à conta do WhatsApp nem faz scraping da
        plataforma. Ele organiza e exporta números que você cola ou importa
        (exportações, planilhas, listas de grupos seus). Respeite a
        privacidade dos participantes e os termos do WhatsApp.
      </p>

      {showNewModal && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={() => setShowNewModal(false)}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-labelledby="new-group-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="new-group-title">Novo grupo</h3>
            <div className={styles.field}>
              <label htmlFor="newname">Nome</label>
              <input
                id="newname"
                autoFocus
                placeholder="Ex: Clientes SP, Família, Time…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createGroup()
                }}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                onClick={() => setShowNewModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                onClick={createGroup}
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function slug(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'grupo'
  )
}

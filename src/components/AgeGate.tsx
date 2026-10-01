interface AgeGateProps {
  onConfirm: () => void
}

export function AgeGate({ onConfirm }: AgeGateProps) {
  return (
    <div className="age-gate">
      <div className="age-card">
        <div className="badge-nsfw" style={{ margin: '0 auto 1rem' }}>
          Conteúdo adulto · 18+
        </div>
        <h1>SoulForge</h1>
        <p>
          Este app gera imagens e chat NSFW sem censura (equivalente free ao
          SoulGen). Só continue se você tem 18 anos ou mais.
        </p>
        <button type="button" className="btn btn-primary" onClick={onConfirm}>
          Tenho 18+ — entrar
        </button>
        <p style={{ marginTop: '1rem', marginBottom: 0, fontSize: '0.8rem' }}>
          Proibido gerar conteúdo envolvendo menores. Idade mínima do personagem:
          18.
        </p>
      </div>
    </div>
  )
}

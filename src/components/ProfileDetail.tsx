import type { GpProfile } from '../types/gp'
import { positionLabel, waLink } from '../lib/filter'
import styles from './ProfileDetail.module.css'

interface ProfileDetailProps {
  profile: GpProfile
  onClose: () => void
}

export function ProfileDetail({ profile, onClose }: ProfileDetailProps) {
  const waText =
    `Fala ${profile.name}, vi teu anúncio no BoyRadar. Sou 21+. Quero marcar. Confirma posição e tamanho real? Sem Pix adiantado.`

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-labelledby="gp-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <div>
            <h2 id="gp-title">{profile.name}</h2>
            <p>
              {profile.age} anos · {positionLabel(profile.position)} · {profile.sizeCm} cm
            </p>
          </div>
          <button type="button" className={styles.close} onClick={onClose}>
            Fechar
          </button>
        </header>

        <dl className={styles.grid}>
          <div>
            <dt>Cidade</dt>
            <dd>
              {profile.city}
              {profile.neighborhood ? ` · ${profile.neighborhood}` : ''}
            </dd>
          </div>
          {profile.body ? (
            <div>
              <dt>Corpo</dt>
              <dd>{profile.body}</dd>
            </div>
          ) : null}
          {profile.heightCm ? (
            <div>
              <dt>Altura / peso</dt>
              <dd>
                {profile.heightCm} cm
                {profile.weightKg ? ` · ${profile.weightKg} kg` : ''}
              </dd>
            </div>
          ) : null}
          {profile.priceFrom ? (
            <div>
              <dt>A partir de</dt>
              <dd>R$ {profile.priceFrom}/h</dd>
            </div>
          ) : null}
          <div>
            <dt>Local próprio</dt>
            <dd>{profile.hasLocal ? 'Sim' : 'Não / a combinar'}</dd>
          </div>
          <div>
            <dt>Atende</dt>
            <dd>{profile.serves.join(', ')}</dd>
          </div>
        </dl>

        <div className={styles.block}>
          <h3>Serviços</h3>
          <p>{profile.services.join(' · ')}</p>
        </div>

        {profile.notes ? (
          <div className={styles.block}>
            <h3>Nota do detetive</h3>
            <p>{profile.notes}</p>
          </div>
        ) : null}

        <div className={styles.actions}>
          {profile.whatsapp ? (
            <a
              className={styles.primary}
              href={waLink(profile.whatsapp, waText)}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          ) : null}
          {profile.sourceUrl ? (
            <a
              className={styles.ghost}
              href={profile.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Ver em {profile.sourceName ?? 'fonte'}
            </a>
          ) : null}
        </div>

        <p className={styles.warn}>
          Anúncios públicos · 21+ · não pague adiantado · confirme idade/posição no chat.
        </p>
      </div>
    </div>
  )
}

import { GROUP_LABEL, buildPortals } from '../lib/portals'
import type { PhoneIntel, PortalLink } from '../lib/types'

type Props = {
  intel: PhoneIntel
}

function byGroup(links: PortalLink[]) {
  const order: PortalLink['group'][] = ['busca', 'mensagens', 'diretorios']
  return order.map((group) => ({
    group,
    label: GROUP_LABEL[group],
    items: links.filter((l) => l.group === group),
  }))
}

export function PortalLinks({ intel }: Props) {
  const groups = byGroup(buildPortals(intel))

  return (
    <section className="panel" aria-label="Portais públicos">
      <h2>Portais públicos</h2>
      <p className="empty">
        Abre buscas e deep links em fontes abertas. Não faz scraping de bases privadas nem dark web.
      </p>
      {groups.map((g) =>
        g.items.length ? (
          <div className="group" key={g.group}>
            <h3>{g.label}</h3>
            <div className="links">
              {g.items.map((link) => (
                <a
                  key={link.id}
                  className="linkCard"
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <strong>{link.label}</strong>
                  <span>{link.description}</span>
                </a>
              ))}
            </div>
          </div>
        ) : null,
      )}
    </section>
  )
}

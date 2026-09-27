const mmFormat = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
})

export function formatMm(value: number): string {
  return `${mmFormat.format(value)} mm`
}

export function formatCount(value: number): string {
  return mmFormat.format(value)
}

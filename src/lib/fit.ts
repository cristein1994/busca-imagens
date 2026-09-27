export type Box = {
  widthMm: number
  heightMm: number
  depthMm: number
}

export type Axis = keyof Box

export type AxisStatus = 'fits' | 'tight' | 'no' | 'unknown'

export type AxisResult = {
  axis: Axis
  itemMm: number
  spaceMm: number | null
  marginMm: number | null
  status: AxisStatus
}

export type Assessment = {
  axes: AxisResult[]
  status: AxisStatus
  tightestMarginMm: number | null
}

export type ParsedMm =
  | { state: 'empty' }
  | { state: 'invalid' }
  | { state: 'ok'; value: number }

const axes: Axis[] = ['widthMm', 'heightMm', 'depthMm']

export function withCase(item: Box, perSideMm: number): Box {
  const pad = perSideMm * 2
  return {
    widthMm: item.widthMm + pad,
    heightMm: item.heightMm + pad,
    depthMm: item.depthMm + pad,
  }
}

export function assess(
  item: Box,
  space: { widthMm: number | null; heightMm: number | null; depthMm: number | null },
  slackMm: number,
): Assessment {
  const results: AxisResult[] = axes.map((axis) => {
    const itemMm = item[axis]
    const spaceMm = space[axis]
    if (spaceMm == null) {
      return { axis, itemMm, spaceMm: null, marginMm: null, status: 'unknown' }
    }
    const marginMm = spaceMm - itemMm
    const status: AxisStatus = marginMm < 0 ? 'no' : marginMm < slackMm ? 'tight' : 'fits'
    return { axis, itemMm, spaceMm, marginMm, status }
  })

  const known = results.filter((axis) => axis.status !== 'unknown')
  let status: AxisStatus = 'unknown'
  if (known.length > 0) {
    if (known.some((axis) => axis.status === 'no')) status = 'no'
    else if (known.some((axis) => axis.status === 'tight')) status = 'tight'
    else status = 'fits'
  }

  const margins = known
    .map((axis) => axis.marginMm)
    .filter((margin): margin is number => margin != null)

  return {
    axes: results,
    status,
    tightestMarginMm: margins.length > 0 ? Math.min(...margins) : null,
  }
}

export function parseMm(raw: string): ParsedMm {
  const trimmed = raw.trim().replace(',', '.')
  if (!trimmed) return { state: 'empty' }
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value <= 0 || value > 2000) return { state: 'invalid' }
  return { state: 'ok', value }
}

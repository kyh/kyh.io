import type { LivelinePalette, ChartLayout, ReferenceLine } from '../types'

export function drawReferenceLine(
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  ref: ReferenceLine,
) {
  const { w, h, pad, toY, chartW } = layout
  const y = toY(ref.value)

  if (y < pad.top - 10 || y > h - pad.bottom + 10) return

  const label = ref.label ?? ''

  if (label) {
    ctx.font = '500 11px system-ui, sans-serif'
    const textW = ctx.measureText(label).width
    const centerX = pad.left + chartW / 2
    const gapPad = 8

    // Line left of text
    ctx.strokeStyle = palette.refLine
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(centerX - textW / 2 - gapPad, y)
    ctx.stroke()

    // Line right of text
    ctx.beginPath()
    ctx.moveTo(centerX + textW / 2 + gapPad, y)
    ctx.lineTo(w - pad.right, y)
    ctx.stroke()

    // Label
    ctx.fillStyle = palette.refLabel
    ctx.textAlign = 'center'
    ctx.fillText(label, centerX, y + 4)
  } else {
    // Full line, no label
    ctx.strokeStyle = palette.refLine
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(w - pad.right, y)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

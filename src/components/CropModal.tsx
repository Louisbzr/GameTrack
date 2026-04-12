'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface Props {
  imageSrc: string
  aspect: number        // 1 pour avatar (cercle), 16/6 pour bannière
  shape?: 'circle' | 'rect'
  onConfirm: (blob: Blob) => void
  onCancel: () => void
  outputWidth: number
  outputHeight: number
}

export default function CropModal({ imageSrc, aspect, shape = 'rect', onConfirm, onCancel, outputWidth, outputHeight }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef       = useRef<HTMLImageElement>(null)

  const [scale,   setScale]   = useState(1)
  const [offset,  setOffset]  = useState({ x: 0, y: 0 })
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, ox: 0, oy: 0 })

  // Container = zone d'affichage. Crop box centré dedans.
  const BOX_W = 400
  const BOX_H = Math.round(BOX_W / aspect)
  const CONTAINER_W = BOX_W + 80
  const CONTAINER_H = BOX_H + 80

  // Init image position when loaded
  function onImgLoad() {
    const img = imgRef.current!
    const scaleX = BOX_W / img.naturalWidth
    const scaleY = BOX_H / img.naturalHeight
    const initScale = Math.max(scaleX, scaleY) * 1.05
    setScale(initScale)
    setOffset({ x: 0, y: 0 })
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
  }

  // Clamp offset so image always covers the crop box
  function clampOffset(ox: number, oy: number, s: number) {
    const imgW = imgSize.w * s
    const imgH = imgSize.h * s
    const maxX = (imgW - BOX_W) / 2
    const maxY = (imgH - BOX_H) / 2
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    }
  }

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    setDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y })
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging || imgSize.w === 0) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    setOffset(clampOffset(dragStart.ox + dx, dragStart.oy + dy, scale))
  }

  function onMouseUp() { setDragging(false) }

  // Touch support
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    setDragging(true)
    setDragStart({ x: t.clientX, y: t.clientY, ox: offset.x, oy: offset.y })
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging) return
    const t = e.touches[0]
    const dx = t.clientX - dragStart.x
    const dy = t.clientY - dragStart.y
    setOffset(clampOffset(dragStart.ox + dx, dragStart.oy + dy, scale))
  }

  function changeScale(delta: number) {
    const newScale = Math.max(0.5, Math.min(4, scale + delta))
    setScale(newScale)
    setOffset(o => clampOffset(o.x, o.y, newScale))
  }

  function reset() {
    if (imgSize.w === 0) return
    const scaleX = BOX_W / imgSize.w
    const scaleY = BOX_H / imgSize.h
    const initScale = Math.max(scaleX, scaleY) * 1.05
    setScale(initScale)
    setOffset({ x: 0, y: 0 })
  }

  async function handleConfirm() {
    const canvas = document.createElement('canvas')
    canvas.width  = outputWidth
    canvas.height = outputHeight
    const ctx = canvas.getContext('2d')!

    if (shape === 'circle') {
      ctx.beginPath()
      ctx.arc(outputWidth / 2, outputHeight / 2, outputWidth / 2, 0, Math.PI * 2)
      ctx.clip()
    }

    const img = imgRef.current!
    const displayW = imgSize.w * scale
    const displayH = imgSize.h * scale

    // Image position relative to crop box center
    const imgLeft = (CONTAINER_W / 2) - (displayW / 2) + offset.x
    const imgTop  = (CONTAINER_H / 2) - (displayH / 2) + offset.y
    const cropLeft = (CONTAINER_W / 2) - (BOX_W / 2)
    const cropTop  = (CONTAINER_H / 2) - (BOX_H / 2)

    const srcX = ((cropLeft - imgLeft) / scale)
    const srcY = ((cropTop  - imgTop)  / scale)
    const srcW = BOX_W / scale
    const srcH = BOX_H / scale

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputWidth, outputHeight)

    canvas.toBlob(blob => { if (blob) onConfirm(blob) }, 'image/jpeg', 0.92)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="rounded-2xl overflow-hidden shadow-2xl border border-border w-full max-w-lg"
        style={{ backgroundColor: 'hsl(var(--background))' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">Recadrer l'image</h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop area */}
        <div className="flex items-center justify-center py-6" style={{ backgroundColor: 'hsl(var(--muted))' }}>
          <div
            ref={containerRef}
            style={{ width: CONTAINER_W, height: CONTAINER_H, position: 'relative', overflow: 'hidden', cursor: dragging ? 'grabbing' : 'grab' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={() => setDragging(false)}
          >
            {/* Image */}
            <img
              ref={imgRef}
              src={imageSrc}
              onLoad={onImgLoad}
              draggable={false}
              alt="crop"
              style={{
                position: 'absolute',
                width:  imgSize.w * scale,
                height: imgSize.h * scale,
                left: '50%',
                top:  '50%',
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />

            {/* Dark overlay with crop hole */}
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              width={CONTAINER_W} height={CONTAINER_H}>
              <defs>
                <mask id="crop-mask">
                  <rect width={CONTAINER_W} height={CONTAINER_H} fill="white" />
                  {shape === 'circle'
                    ? <ellipse cx={CONTAINER_W/2} cy={CONTAINER_H/2} rx={BOX_W/2} ry={BOX_H/2} fill="black" />
                    : <rect x={(CONTAINER_W-BOX_W)/2} y={(CONTAINER_H-BOX_H)/2} width={BOX_W} height={BOX_H} fill="black" />
                  }
                </mask>
              </defs>
              <rect width={CONTAINER_W} height={CONTAINER_H} fill="rgba(0,0,0,0.55)" mask="url(#crop-mask)" />
              {/* Border of crop area */}
              {shape === 'circle'
                ? <ellipse cx={CONTAINER_W/2} cy={CONTAINER_H/2} rx={BOX_W/2} ry={BOX_H/2} fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="6 4" />
                : <rect x={(CONTAINER_W-BOX_W)/2} y={(CONTAINER_H-BOX_H)/2} width={BOX_W} height={BOX_H} fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="6 4" />
              }
            </svg>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => changeScale(-0.1)} className="p-2 rounded-lg glass hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <ZoomOut className="w-4 h-4" />
            </button>
            <input type="range" min="0.3" max="4" step="0.05" value={scale}
              onChange={e => { const s = Number(e.target.value); setScale(s); setOffset(o => clampOffset(o.x, o.y, s)) }}
              className="w-24 accent-primary" />
            <button onClick={() => changeScale(0.1)} className="p-2 rounded-lg glass hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={reset} className="p-2 rounded-lg glass hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Réinitialiser">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground glass transition-colors">
              Annuler
            </button>
            <button onClick={handleConfirm} className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
              <Check className="w-4 h-4" /> Appliquer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
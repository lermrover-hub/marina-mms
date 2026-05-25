"use client"
import React, { useRef, useEffect, useState } from "react"
import SignaturePad from "signature_pad"

interface SignaturePadProps {
  onSave: (dataUrl: string) => void
  onClear?: () => void
  width?: number
  height?: number
}

export function SignaturePadComponent({
  onSave,
  onClear,
  width = 500,
  height = 200,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    if (!canvasRef.current) return
    const pad = new SignaturePad(canvasRef.current, {
      backgroundColor: "rgb(255, 255, 255)",
      penColor: "#1f2933",
    })
    pad.addEventListener("beginStroke", () => setIsEmpty(false))
    padRef.current = pad
    return () => {
      pad.off()
    }
  }, [])

  function handleClear() {
    padRef.current?.clear()
    setIsEmpty(true)
    onClear?.()
  }

  function handleSave() {
    if (!padRef.current || padRef.current.isEmpty()) return
    const dataUrl = padRef.current.toDataURL("image/png")
    onSave(dataUrl)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full touch-none"
          style={{ maxHeight: height }}
        />
      </div>
      <p className="text-xs text-gray-400 text-center">Draw your signature above</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isEmpty}
          className="flex-1 px-3 py-2 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm Signature
        </button>
      </div>
    </div>
  )
}

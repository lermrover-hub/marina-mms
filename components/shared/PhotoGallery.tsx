"use client"
import React, { useState } from "react"
import { X, ZoomIn } from "lucide-react"

type Photo = { url: string; name: string; caption?: string }

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [lightbox, setLightbox] = useState<Photo | null>(null)

  if (photos.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">No photos uploaded yet.</p>
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((p, i) => (
          <div key={i} className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200"
            onClick={() => setLightbox(p)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.name} className="h-28 w-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {p.caption && (
              <p className="px-2 py-1 text-xs text-gray-600 truncate">{p.caption}</p>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.url} alt={lightbox.name}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}

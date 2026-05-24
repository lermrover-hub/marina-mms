"use client"
import React, { useState, useRef } from "react"
import { Upload, X, File, Loader2, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export type UploadedFile = {
  name: string
  path: string
  url: string
  type: string
  size: number
}

type PhotoUploadProps = {
  bucket?: string
  folder: string          // e.g. "work-orders/wo-001/before"
  category?: string       // label shown above upload zone e.g. "Before", "After", "During"
  multiple?: boolean
  accept?: string
  onUploaded?: (files: UploadedFile[]) => void
  existingFiles?: UploadedFile[]
}

export function PhotoUpload({
  bucket = "marina-files",
  folder,
  category,
  multiple = true,
  accept = "image/*,application/pdf",
  onUploaded,
  existingFiles = [],
}: PhotoUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(fileList: FileList) {
    setError(null)
    setUploading(true)
    const uploaded: UploadedFile[] = []

    for (const file of Array.from(fileList)) {
      const ext = file.name.split(".").pop()
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type, upsert: false })

      if (uploadError) {
        setError(`Failed to upload ${file.name}: ${uploadError.message}`)
        continue
      }

      const { data: signedData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60) // 1 hour

      uploaded.push({
        name: file.name,
        path,
        url: signedData?.signedUrl ?? "",
        type: file.type,
        size: file.size,
      })
    }

    const newFiles = [...files, ...uploaded]
    setFiles(newFiles)
    onUploaded?.(newFiles)
    setUploading(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  async function removeFile(path: string) {
    await supabase.storage.from(bucket).remove([path])
    const updated = files.filter(f => f.path !== path)
    setFiles(updated)
    onUploaded?.(updated)
  }

  const isImage = (type: string) => type.startsWith("image/")

  return (
    <div className="space-y-3">
      {category && (
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{category}</p>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-colors"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 text-teal-500 animate-spin" />
        ) : (
          <Upload className="h-6 w-6 text-gray-400" />
        )}
        <p className="text-sm text-gray-500">
          {uploading ? "Uploading…" : "Drag & drop or click to upload"}
        </p>
        <p className="text-xs text-gray-400">JPEG, PNG, WebP, PDF · max 10 MB each</p>
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      {/* File grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {files.map(f => (
            <div key={f.path} className="relative group rounded-lg border border-gray-200 overflow-hidden bg-white">
              {isImage(f.type) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt={f.name} className="h-24 w-full object-cover" />
              ) : (
                <div className="flex h-24 items-center justify-center bg-gray-50">
                  <File className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div className="p-1.5">
                <p className="text-xs text-gray-600 truncate">{f.name}</p>
                <p className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); removeFile(f.path) }}
                className="absolute top-1 right-1 rounded-full bg-white/80 p-0.5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <CheckCircle2 className="absolute top-1 left-1 h-4 w-4 text-green-500 opacity-0 group-hover:opacity-100" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

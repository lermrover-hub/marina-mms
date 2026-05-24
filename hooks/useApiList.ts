"use client"

import { useCallback, useEffect, useState } from "react"

type UseApiListOptions<T> = {
  enabled?: boolean
  initialData?: T[]
  errorMessage?: string
}

export type UseApiListResult<T> = {
  data: T[]
  setData: React.Dispatch<React.SetStateAction<T[]>>
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

export function useApiList<T>(
  url: string,
  options: UseApiListOptions<T> = {},
): UseApiListResult<T> {
  const {
    enabled = true,
    initialData = [],
    errorMessage = "Failed to load",
  } = options

  const [data, setData] = useState<T[]>(initialData)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(url)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? errorMessage)
      }

      if (!Array.isArray(payload)) {
        throw new Error(payload?.error ?? errorMessage)
      }

      setData(payload as T[])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [enabled, errorMessage, url])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, setData, loading, error, reload }
}

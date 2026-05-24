"use client"
import { useEffect } from "react"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <html>
      <body>
        <main style={{ padding: 24, fontFamily: "sans-serif" }}>
          <h1>500 - Server Error</h1>
          <p>Something went wrong while loading Marina MMS.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}

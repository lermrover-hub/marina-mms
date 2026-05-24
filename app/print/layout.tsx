// Minimal layout for print/PDF pages — no sidebar, no navbar, no chrome
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          @media print {
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; }
          }
          body { background: #f5f5f5; }
          @media print { body { background: white; } }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}

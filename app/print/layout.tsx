// Minimal layout for print/PDF pages — no sidebar, no navbar, no chrome
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; background: white; }
        }
        body { background: #f5f5f5; }
      `}</style>
      {children}
    </>
  )
}

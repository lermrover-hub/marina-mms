"use client"
import React from "react"
import Link from "next/link"
import { Printer, ArrowLeft } from "lucide-react"

function starPoints(cx: number, cy: number, outer: number, inner: number, points = 5) {
  const step = Math.PI / points
  let d = ''
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = i * step - Math.PI / 2
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    d += (i === 0 ? '' : ',') + `${x.toFixed(1)},${y.toFixed(1)}`
  }
  return d
}

function ORMLogo({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      {[
        [30, 28, 10], [65, 14, 8], [95, 22, 6], [120, 10, 7],
        [148, 18, 9], [175, 8, 6], [200, 20, 8], [218, 34, 7],
      ].map(([cx, cy, r], i) => (
        <polygon key={i} points={starPoints(cx, cy, r, r * 0.42)} fill="#9a7d2e" />
      ))}
      <text x="120" y="105" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="28" fontWeight="400" fill="#9a7d2e" letterSpacing="1">
        Ocean Rover Marina
      </text>
      <text x="120" y="130" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="11" fontWeight="400" fill="#9a7d2e" letterSpacing="4">
        SAMUI YACHT CLUB
      </text>
    </svg>
  )
}

function Watermark() {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
    }}>
      <span style={{
        transform: 'rotate(-35deg)',
        fontSize: '52px',
        fontFamily: 'Georgia, serif',
        color: 'rgba(154,125,46,0.08)',
        fontWeight: 'bold',
        letterSpacing: '4px',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}>
        OCEAN ROVER MARINA
      </span>
    </div>
  )
}

const svcItems = [
  { label: 'Trailer hire', unit: '/ day', price: '' },
  { label: 'Lift Up & Down by lifting device (10 Tonnes max)', unit: '', price: '6,000 THB' },
  { label: 'Lift Up or Down (By crane) 4 hrs. max for survey', unit: '', price: '10,000 THB + 7% VAT' },
  { label: 'Shampoo wash', unit: 'Rate @ 80 THB / Ft.', price: '' },
  { label: 'Cradles / Boat stand hired per time', unit: 'Rate @ 20% of storage fee — from date of lifting', price: '' },
  { label: 'Utilities : Electricity @ 9 THB / 1 kWh,  Water @ 80 THB / unit', unit: '', price: '' },
  { label: 'Anti-fouling painting', unit: '100 THB / Ft.', price: '' },
]

export default function HardstandFormPage() {
  return (
    <div className="bg-white min-h-screen">
      {/* Screen controls */}
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <Link href="/documents"
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-semibold text-gray-700">Hardstand Service Form</span>
        <div className="ml-auto">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Printable Page */}
      <div className="print:hidden mx-auto my-4 max-w-5xl rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">Fillable hardstand details</p>
          <p className="text-xs text-gray-500">Use these fields before printing or saving the PDF.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            ["Vessel Name", "vesselName", "Nordic Star"],
            ["Boat Owner", "boatOwner", "Erik Lindstrom"],
            ["Form No.", "formNo", "HS-2026-001"],
            ["LOA (ft)", "loaFt", "41"],
            ["Draft (ft)", "draftFt", "5.2"],
            ["Weight (T)", "weightT", "12"],
            ["Registration No.", "registrationNo", "SE-2041"],
            ["Country", "country", "Sweden"],
            ["Arrival Date", "arrivalDate", "2026-05-20"],
            ["Arrival Time", "arrivalTime", "09:00"],
            ["Storage Duration", "duration", "14 days"],
            ["Service Date", "serviceDate", "2026-05-21"],
          ].map(([label, name, placeholder]) => (
            <label key={name} className="space-y-1 text-xs font-medium text-gray-600">
              <span>{label}</span>
              <input
                name={name}
                placeholder={placeholder}
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="relative mx-auto bg-white"
        style={{ width: '210mm', minHeight: '297mm', padding: '14mm 16mm', fontFamily: 'Times New Roman, serif', fontSize: '11px', color: '#111', position: 'relative' }}>
        <Watermark />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <ORMLogo size={130} />
            <div style={{ textAlign: 'center', flex: 1, paddingTop: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 }}>
                Hardstand Service Form
              </div>
              <div style={{ fontSize: 10.5, color: '#555' }}>
                ใบขอใช้บริการพื้นที่ Hardstand / ยกเรือขึ้นบก
              </div>
              <div style={{ fontSize: 10.5, color: '#555' }}>
                Ocean Rover Marina Co., Ltd. | Ko Samui, Surat Thani 84320
              </div>
            </div>
            {/* Form No box */}
            <div style={{ border: '1.5px solid #333', padding: '6px 12px', marginTop: 12, minWidth: 120, textAlign: 'center', fontSize: 11 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Form No.</div>
              <div style={{ borderBottom: '1px solid #555', height: 18 }} />
            </div>
          </div>

          <hr style={{ borderTop: '2px solid #9a7d2e', marginBottom: 10 }} />

          {/* Section 1: Vessel Info */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>Vessel Name</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 6, paddingRight: 16, width: '38%' }} />
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>Boat Owner</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 6 }} />
              </tr>
              <tr>
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>LOA</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 6 }}>
                  Mtrs. (<span style={{ display: 'inline-block', minWidth: 40 }} /> Ft.)
                </td>
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>Draft</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 6 }}>
                  Mtrs. (<span style={{ display: 'inline-block', minWidth: 40 }} /> Ft.)
                  &nbsp;&nbsp;
                  <span style={{ whiteSpace: 'nowrap' }}>Weight</span>&nbsp;
                  <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 60 }} /> T
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>Last Port of Call</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 6 }} />
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>Country</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 6 }}>
                  &nbsp;&nbsp;&nbsp;&nbsp;
                  <span style={{ whiteSpace: 'nowrap' }}>Reg. No.</span>&nbsp;
                  <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 90 }} />
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>Next Port of Call</td>
                <td colSpan={3} style={{ borderBottom: '1px solid #555', paddingBottom: 6 }} />
              </tr>
            </tbody>
          </table>

          {/* Checkboxes */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 6, alignItems: 'center' }}>
            {['Sail', 'Motor', 'Multi hull', 'Mono hull'].map(t => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 13, height: 13, border: '1px solid #555' }} />{t}
              </span>
            ))}
            <span style={{ marginLeft: 'auto' }}>
              Colour : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 80 }} />
            </span>
          </div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 10, alignItems: 'center' }}>
            {['GRP', 'Wood', 'Steel', 'Aluminium'].map(t => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 13, height: 13, border: '1px solid #555' }} />{t}
              </span>
            ))}
            <span style={{ marginLeft: 8 }}>
              Other : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 80 }} />
            </span>
          </div>

          {/* Arrival / Duration */}
          <table style={{ width: '100%', marginBottom: 8 }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap' }}>Arrival Date :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 5, paddingRight: 12 }} />
                <td style={{ paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap' }}>Arrival Time :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 5, paddingRight: 12 }} />
                <td style={{ paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap' }}>Duration of Storage :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 5 }}>
                  &nbsp;&nbsp;<span style={{ fontSize: 10 }}>Month(s) / Day(s)</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Licensee */}
          <hr style={{ borderTop: '1px solid #ccc', margin: '6px 0' }} />
          <div style={{ marginBottom: 4, fontWeight: 'bold' }}>The Licensee / Boat Owner or Owner&apos;s Representative</div>
          <table style={{ width: '100%', marginBottom: 8 }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap' }}>Full Name :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 5, paddingRight: 16, width: '40%' }} />
                <td style={{ paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap' }}>Nationality :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 5 }} />
              </tr>
              <tr>
                <td style={{ paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap' }}>Passport / ID # :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 5, paddingRight: 16 }} />
                <td style={{ paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap' }}>Address :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 5 }} />
              </tr>
              <tr>
                <td style={{ paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap' }}>Mobile Phone :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 5, paddingRight: 16 }} />
                <td style={{ paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap' }}>E-mail :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 5 }} />
              </tr>
              <tr>
                <td style={{ paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap' }}>Business Phone :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 5, paddingRight: 16 }} />
                <td style={{ paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap' }}>Fax :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 5 }} />
              </tr>
            </tbody>
          </table>

          {/* Documents attached */}
          <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 5 }}>I hereby attach the following :</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 8 }}>
            {['Certificate of Registry', 'Certificate of Boat Insurance', 'Passport Copy of the Licensee'].map(t => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 13, height: 13, border: '1px solid #555' }} />{t}
              </span>
            ))}
          </div>

          {/* Terms */}
          <div style={{ fontSize: 10.5, lineHeight: 1.6, marginBottom: 8, padding: '6px 0', borderTop: '1px solid #ddd', borderBottom: '1px solid #ddd', textAlign: 'justify' }}>
            The Licensee have read the Haul Out - Boat Lifter Contract as clearly displayed on the Marina Office wall (as amended from time to time) and agreed to be bound by the terms and conditions thereof. This registration form shall form an integral part of the Boat Lifter Contract.
            <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: 4 }}>
              I accept these Terms and Conditions and those overleaf
            </div>
          </div>

          {/* Service Requirements */}
          <div style={{ border: '1.5px solid #9a7d2e', borderRadius: 4, padding: '8px 12px', background: '#fffdf5', marginBottom: 10 }}>
            <div style={{ fontWeight: 'bold', fontSize: 12, color: '#9a7d2e', marginBottom: 6 }}>Service Requirements</div>

            {/* Service date / time */}
            <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 13, height: 13, border: '1px solid #555' }} />
                <strong>Service on Date :</strong>
              </span>
              <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 100 }} />
              <span>Time :</span>
              <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 80 }} />
            </div>

            {/* Transport */}
            <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
              {['Ramp', 'Towing car', 'Trailer'].map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-block', width: 13, height: 13, border: '1px solid #555' }} />{t}
                </span>
              ))}
            </div>

            {/* Service items */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {svcItems.map((svc, i) => (
                  <tr key={i}>
                    <td style={{ paddingBottom: 5, paddingRight: 8, width: 24, verticalAlign: 'top', paddingTop: 2 }}>
                      <span style={{ display: 'inline-block', width: 13, height: 13, border: '1px solid #555' }} />
                    </td>
                    <td style={{ paddingBottom: 5, verticalAlign: 'top' }}>
                      <span>{svc.label}</span>
                      {svc.unit && <span style={{ fontSize: 10, color: '#555', marginLeft: 6 }}>{svc.unit}</span>}
                      {/* Date/time field for shampoo wash */}
                      {svc.label.includes('Shampoo') && (
                        <span style={{ marginLeft: 12 }}>
                          Date : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 80 }} />
                          &nbsp; Time : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 60 }} />
                        </span>
                      )}
                    </td>
                    <td style={{ paddingBottom: 5, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: svc.price ? 'bold' : 'normal', color: svc.price ? '#9a7d2e' : 'inherit' }}>
                      {svc.price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signature 1 — Lift Up */}
          <div style={{ border: '1px solid #ddd', borderRadius: 4, padding: '8px 12px', marginBottom: 8 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 10.5 }}>Lift UP / In — Authorisation</div>
            <table style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ width: '48%', paddingRight: 12 }}>
                    <div>Signed <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 160 }} /> The Licensee</div>
                    <div style={{ fontSize: 10, marginTop: 2 }}>Boat Owner or Owner&apos;s Representative</div>
                  </td>
                  <td style={{ width: '52%' }}>
                    <div>ลายมือชื่อพนักงาน : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 100 }} /></div>
                    <div style={{ marginTop: 4 }}>วันที่ / Date : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 120 }} /></div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signature 2 — Lift Down */}
          <div style={{ border: '1px solid #ddd', borderRadius: 4, padding: '8px 12px', marginBottom: 10 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 10.5 }}>Lift DOWN / Out — Authorisation</div>
            <table style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ width: '48%', paddingRight: 12 }}>
                    <div>Lifting Down on date : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 80 }} /> Time : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 50 }} /></div>
                    <div style={{ marginTop: 6 }}>Signed <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 150 }} /> The Licensee</div>
                    <div style={{ fontSize: 10, marginTop: 2 }}>Boat Owner or Owner&apos;s Representative</div>
                  </td>
                  <td style={{ width: '52%' }}>
                    <div>ลายมือชื่อพนักงานผู้ลากเรือ : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 80 }} /></div>
                    <div style={{ marginTop: 4 }}>วันที่ / Date : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 120 }} /></div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Marina Manager sign */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'center', minWidth: 200 }}>
              <div style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 180, marginBottom: 4 }} />
              <div style={{ fontSize: 10 }}>Marina Manager</div>
              <div style={{ marginTop: 4 }}>
                Date : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 120 }} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 12, borderTop: '1px solid #ccc', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#888' }}>
            <span>Ocean Rover Marina Co., Ltd. | Ko Samui, Surat Thani 84320, Thailand</span>
            <span>Tel: +66 (0)77 XXX XXX | marina@oceanrovermarina.com</span>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; }
          @page { size: A4; margin: 0; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}

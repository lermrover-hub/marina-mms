"use client"
import React from "react"
import Link from "next/link"
import { Printer, ArrowLeft } from "lucide-react"
import { PBLogo, PBWatermark, COMPANY } from "@/components/print/OfficialDocumentShell"

export default function BerthingFormPage() {
  return (
    <div className="bg-white min-h-screen">
      {/* ── Screen-only controls ────────────────────────── */}
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <Link href="/documents"
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-semibold text-gray-700">Berthing Registration Form</span>
        <div className="ml-auto">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* ── Printable Page ──────────────────────────────── */}
      <div className="print:hidden mx-auto my-4 max-w-5xl rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">Fillable berthing details</p>
          <p className="text-xs text-gray-500">Use these fields before printing or saving the PDF.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            ["Vessel Name", "vesselName", "Sea Hawk"],
            ["Boat Owner", "boatOwner", "James Thornton"],
            ["Berth No.", "berthNo", "B-04"],
            ["LOA (ft)", "loaFt", "42"],
            ["Beam (ft)", "beamFt", "13"],
            ["Draft (ft)", "draftFt", "4.5"],
            ["Registration No.", "registrationNo", "TH-1234"],
            ["Country", "country", "Thailand"],
            ["Owner Full Name", "ownerName", "James Thornton"],
            ["Mobile Phone", "mobilePhone", "+66 81 234 5678"],
            ["Email", "email", "owner@example.com"],
            ["Commencement Date", "commencementDate", "2026-05-20"],
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
        <PBWatermark />

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            {/* Logo */}
            <PBLogo height={72} />

            {/* Title */}
            <div style={{ textAlign: 'center', flex: 1, paddingTop: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 }}>
                Berthing Registration Form
              </div>
              <div style={{ fontSize: 10, color: '#555', lineHeight: 1.5 }}>
                {COMPANY.nameTh}<br />
                {COMPANY.address}<br />
                เลขประจำตัวผู้เสียภาษี {COMPANY.taxId} | Tel: {COMPANY.phone}
              </div>
            </div>

            {/* Berth No box */}
            <div style={{ border: '1.5px solid #333', padding: '6px 12px', marginTop: 12, minWidth: 120, textAlign: 'center', fontSize: 11 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Berth No.</div>
              <div style={{ borderBottom: '1px solid #555', height: 18 }} />
            </div>
          </div>

          <hr style={{ borderTop: '2px solid #9a7d2e', marginBottom: 12 }} />

          {/* ── Section 1: Vessel Info ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>Vessel Name</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 6, paddingRight: 16, width: '38%' }} />
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>Boat Owner</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 6 }} />
              </tr>
              <tr>
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>L O A</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 6 }}>
                  <span style={{ marginRight: 8 }}>Mtrs.</span>
                  (<span style={{ display: 'inline-block', minWidth: 40 }} /> Ft.)
                </td>
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>Beam</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 6 }}>
                  Mtrs. (<span style={{ display: 'inline-block', minWidth: 40 }} />)
                  &nbsp;&nbsp;
                  <span style={{ whiteSpace: 'nowrap' }}>Draft</span>
                  &nbsp;
                  <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 40 }} />
                  &nbsp;Mtrs. (<span style={{ display: 'inline-block', minWidth: 30 }} /> Ft)
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>Port of Registry</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 6 }} />
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>Country</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 6 }}>
                  &nbsp;&nbsp;&nbsp;&nbsp;
                  <span style={{ whiteSpace: 'nowrap' }}>Reg. No.</span>
                  &nbsp;
                  <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 90 }} />
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Checkboxes row 1: Vessel type ── */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 8, alignItems: 'center' }}>
            {['Sail', 'Motor', 'Multi hull', 'Mono hull'].map(t => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 13, height: 13, border: '1px solid #555' }} />
                {t}
              </span>
            ))}
            <span style={{ marginLeft: 'auto' }}>
              Colour : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 90 }} />
            </span>
          </div>

          {/* ── Checkboxes row 2: Hull material ── */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 8, alignItems: 'center' }}>
            {['GRP', 'Wood', 'Steel', 'Aluminium'].map(t => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 13, height: 13, border: '1px solid #555' }} />
                {t}
              </span>
            ))}
            <span style={{ marginLeft: 8 }}>
              Other : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 90 }} />
            </span>
          </div>

          {/* ── Source ── */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
            <span>Source :</span>
            {['Internet', 'Friend'].map(t => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 13, height: 13, border: '1px solid #555' }} />
                {t}
              </span>
            ))}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 13, height: 13, border: '1px solid #555' }} />
              Yacht Club <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 80 }} />
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 13, height: 13, border: '1px solid #555' }} />
              Other : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 80 }} />
            </span>
          </div>

          {/* ── Ports ── */}
          <table style={{ width: '100%', marginBottom: 6 }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>Last port of call :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 6, paddingRight: 16 }} />
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>Next Port of call :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 6 }} />
              </tr>
              <tr>
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>Commencement Date :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 6, paddingRight: 8 }} />
                <td style={{ paddingBottom: 6, paddingRight: 8, whiteSpace: 'nowrap' }}>Est. arrival time</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 6 }}>
                  &nbsp;&nbsp;&nbsp;&nbsp;
                  <span style={{ whiteSpace: 'nowrap' }}>Est. Maturity date</span>
                  &nbsp;
                  <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 90 }} />
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Separator ── */}
          <hr style={{ borderTop: '1px solid #ccc', margin: '8px 0' }} />

          {/* ── Section 2: Licensee ── */}
          <div style={{ marginBottom: 4, fontWeight: 'bold', fontSize: 11 }}>The Licensee / Boat Owner or Owner&apos;s Representative</div>
          <table style={{ width: '100%', marginBottom: 6 }}>
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
                <td style={{ paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap' }}>Country :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 5, paddingRight: 16 }} />
                <td style={{ paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap' }}>Mobile Phone :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 5 }} />
              </tr>
              <tr>
                <td style={{ paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap' }}>Business Phone :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 5, paddingRight: 16 }} />
                <td style={{ paddingBottom: 5, paddingRight: 8, whiteSpace: 'nowrap' }}>E-mail :</td>
                <td style={{ borderBottom: '1px solid #555', paddingBottom: 5 }} />
              </tr>
            </tbody>
          </table>

          {/* ── Licensing Fee ── */}
          <hr style={{ borderTop: '1px solid #ccc', margin: '8px 0' }} />
          <table style={{ width: '100%', marginBottom: 8 }}>
            <tbody>
              <tr>
                <td style={{ paddingRight: 8, whiteSpace: 'nowrap', fontWeight: 'bold' }}>Licensing Fee :</td>
                <td>
                  Rate per month :
                  <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 100, margin: '0 4px' }} />
                  Baht
                  <span style={{ fontSize: 9.5, marginLeft: 4 }}>(Exclusive of VAT)</span>
                </td>
                <td>
                  Rate per day :
                  <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 100, margin: '0 4px' }} />
                  Baht
                  <span style={{ fontSize: 9.5, marginLeft: 4 }}>(Exclusive of VAT)</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Terms ── */}
          <div style={{ fontSize: 10.5, lineHeight: 1.65, marginBottom: 8, textAlign: 'justify', padding: '8px 0', borderTop: '1px solid #ddd', borderBottom: '1px solid #ddd' }}>
            <p style={{ marginBottom: 6 }}>
              The Licensee or its designated person shall be required to notify the Licensor or the Marina manager of the arrival and departure of its vessel at the Marina basin including length of time that its vessel will not use the Berth. During such time, the Licensee hereby authorizes the Licensor to allow other vessel owners to use the Berth.
            </p>
            <p>
              The Licensee have read the Marina By-Laws (as amended from time to time) and agreed to be bound by the terms and conditions thereof. This registration form shall form an integral part of the Berth License Agreement.
            </p>
          </div>

          {/* ── Documents attached ── */}
          <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 6 }}>I hereby attach</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 14 }}>
            {['Certificate of Registry', 'Certificate of Boat Insurance', 'Passport Copy of the Licensee'].map(t => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 13, height: 13, border: '1px solid #555' }} />
                {t}
              </span>
            ))}
          </div>

          {/* ── Signatures ── */}
          <table style={{ width: '100%', marginBottom: 10 }}>
            <tbody>
              <tr>
                <td style={{ width: '48%', verticalAlign: 'bottom', paddingRight: 16 }}>
                  <div style={{ marginBottom: 4 }}>
                    Signed : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 160 }} /> the Licensee
                  </div>
                  <div style={{ marginLeft: 48, marginBottom: 2 }}>
                    (<span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 120 }} />)
                  </div>
                  <div style={{ fontSize: 10 }}>Boat Owner or Owner&apos;s Representative</div>
                  <div style={{ marginTop: 6 }}>
                    Date : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 140 }} />
                  </div>
                </td>
                <td style={{ width: '4%' }} />
                <td style={{ width: '48%', verticalAlign: 'bottom' }}>
                  <div style={{ marginBottom: 4 }}>
                    Signed : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 160 }} />
                  </div>
                  <div style={{ marginLeft: 48, marginBottom: 2 }}>
                    (<span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 120 }} />)
                  </div>
                  <div style={{ fontSize: 10 }}>Marina Manager</div>
                  <div style={{ marginTop: 6 }}>
                    Date : <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 140 }} />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Payment Details ── */}
          <div style={{ border: '1.5px solid #9a7d2e', borderRadius: 4, padding: '8px 12px', background: '#fffdf5' }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 6, color: '#9a7d2e', fontSize: 12 }}>
              Payment Details
            </div>
            <div style={{ marginBottom: 4, fontSize: 10.5 }}>
              Please note : Berthing fee is required to be paid in advance on 1st day of berthing
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              {['VISA', 'MASTER', 'CASH'].map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ display: 'inline-block', width: 13, height: 13, border: '1px solid #555' }} />
                  {t}
                </span>
              ))}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 13, height: 13, border: '1px solid #555' }} />
                Bank Transfer
                <span style={{ display: 'inline-block', borderBottom: '1px solid #555', minWidth: 140 }} />
              </span>
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{ marginTop: 14, borderTop: '1px solid #ccc', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#888' }}>
            <span>{COMPANY.nameTh} | {COMPANY.address}</span>
            <span>Tel: {COMPANY.phone} | เลขประจำตัวผู้เสียภาษี {COMPANY.taxId}</span>
          </div>
        </div>
      </div>

      {/* Print styles */}
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

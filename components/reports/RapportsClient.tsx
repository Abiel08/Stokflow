"use client"

import { useState, useMemo } from "react"
import { BarChart3, PieChart as PieIcon, Repeat2, Shield, FileSpreadsheet, Download, AlertOctagon } from "lucide-react"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { formatMoney, formatNumber } from "@/lib/currency"

type Tab = "valorisation" | "repartition" | "mouvements" | "bilan" | "defectueux" | "audit"

interface CategoryRow { name: string; count: number; qty: number; buyValue: number; sellValue: number }
interface ProductRow { id: string; name: string; reference: string; category: string; goodQty: number; defectiveQty: number; minQty: number; buyPrice: number | null; sellPrice: number; stockValue: number; movementsCount: number }
interface MovementRow { date: string; type: string; product: string; quantity: number; warehouse: string; destWarehouse: string | null; user: string; reason: string }
interface BilanMovementRow { productId: string; productName: string; reference: string; type: string; quantity: number; date: string }
interface LogRow { date: string; user: string; action: string; module: string; detail: string }
interface DefectiveSummary { declaredValue: number; restoredValue: number; soldQty: number; soldRevenue: number; soldCostValue: number; scrappedValue: number; realizedLoss: number; currentDefectiveValue: number }
interface DefectiveMovementRow { date: string; type: string; product: string; quantity: number; unitCost: number; unitPrice: number | null; cost: number; revenue: number | null }

const PIE_COLORS = ["#111827", "#7f1d1d", "#b91c1c", "#64748b", "#94a3b8", "#cbd5e1", "#334155", "#1e293b"]

function downloadCSV(filename: string, lines: string[]) {
  const csv = lines.join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function csvRow(values: (string | number)[]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "")
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return values.map(escape).join(";")
}

// ─────────────────────────────────────────────
// Fiche de stock (méthode CUMP) — bilan par produit et par année
// ─────────────────────────────────────────────

interface FicheRow {
  kind: "SI" | "ENTREE" | "SORTIE"
  label: string
  date: string
  entreeQty: number | null
  entreeCU: number | null
  entreeCT: number | null
  sortieQty: number | null
  sortieCU: number | null
  sortieCT: number | null
  stockQty: number
  stockCU: number
  stockCT: number
}

function computeFicheDeStock(movements: BilanMovementRow[], productId: string, buyPrice: number, year: number) {
  const yearStart = new Date(`${year}-01-01T00:00:00`).getTime()
  const yearEnd = new Date(`${year}-12-31T23:59:59`).getTime()

  const sorted = movements
    .filter((m) => m.productId === productId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let qty = 0
  let ct = 0
  const rows: FicheRow[] = []
  let entreeCount = 0
  let sortieCount = 0
  let siPushed = false

  for (const m of sorted) {
    const t = new Date(m.date).getTime()
    if (t > yearEnd) break

    const isEntree = m.type === "IN" || m.type === "RESTORE"
    const isSortie = m.type === "OUT" || m.type === "DEFECTIVE"

    if (t < yearStart) {
      // Avant l'année sélectionnée : on accumule silencieusement pour obtenir le Stock Initial
      if (isEntree) { ct += m.quantity * buyPrice; qty += m.quantity }
      else if (isSortie) { const cu = qty > 0 ? ct / qty : 0; ct -= m.quantity * cu; qty -= m.quantity }
      continue
    }

    if (!siPushed) {
      const cu = qty > 0 ? ct / qty : 0
      rows.push({ kind: "SI", label: "S.I.", date: `01/01/${year}`, entreeQty: null, entreeCU: null, entreeCT: null, sortieQty: null, sortieCU: null, sortieCT: null, stockQty: qty, stockCU: cu, stockCT: ct })
      siPushed = true
    }

    if (!isEntree && !isSortie) continue // transferts internes / mise au rebut du stock défectueux : hors périmètre de cette fiche

    const dateStr = new Date(m.date).toLocaleDateString("fr-FR")
    if (isEntree) {
      ct += m.quantity * buyPrice
      qty += m.quantity
      const cu = qty > 0 ? ct / qty : 0
      entreeCount++
      rows.push({ kind: "ENTREE", label: `Entrée ${entreeCount}`, date: dateStr, entreeQty: m.quantity, entreeCU: buyPrice, entreeCT: m.quantity * buyPrice, sortieQty: null, sortieCU: null, sortieCT: null, stockQty: qty, stockCU: cu, stockCT: ct })
    } else {
      const cuBefore = qty > 0 ? ct / qty : 0
      const sortieCT = m.quantity * cuBefore
      ct -= sortieCT
      qty -= m.quantity
      sortieCount++
      rows.push({ kind: "SORTIE", label: `Sortie ${sortieCount}`, date: dateStr, entreeQty: null, entreeCU: null, entreeCT: null, sortieQty: m.quantity, sortieCU: cuBefore, sortieCT, stockQty: qty, stockCU: qty > 0 ? cuBefore : 0, stockCT: ct })
    }
  }

  if (!siPushed) {
    rows.push({ kind: "SI", label: "S.I.", date: `01/01/${year}`, entreeQty: null, entreeCU: null, entreeCT: null, sortieQty: null, sortieCU: null, sortieCT: null, stockQty: qty, stockCU: qty > 0 ? ct / qty : 0, stockCT: ct })
  }

  const totalEntreeQty = rows.reduce((s, r) => s + (r.entreeQty ?? 0), 0)
  const totalEntreeCT = rows.reduce((s, r) => s + (r.entreeCT ?? 0), 0)
  const totalSortieQty = rows.reduce((s, r) => s + (r.sortieQty ?? 0), 0)
  const totalSortieCT = rows.reduce((s, r) => s + (r.sortieCT ?? 0), 0)
  const last = rows[rows.length - 1]

  return {
    rows,
    totals: { entreeQty: totalEntreeQty, entreeCT: totalEntreeCT, sortieQty: totalSortieQty, sortieCT: totalSortieCT, stockQty: last.stockQty, stockCT: last.stockCT },
  }
}

function downloadFicheCSV(rows: FicheRow[], totals: ReturnType<typeof computeFicheDeStock>["totals"], productName: string, year: number, companyName: string) {
  const fmt = (n: number) => formatNumber(n, n % 1 !== 0 ? 2 : 0)
  const lines: string[] = []
  lines.push(csvRow([`Fiche de stock — ${companyName}`]))
  lines.push(csvRow([`Produit : ${productName}`]))
  lines.push(csvRow([`Année : ${year}`]))
  lines.push("")
  lines.push(csvRow(["", "ENTRÉES", "", "", "", "SORTIES", "", "", "", "STOCKS", "", ""]))
  lines.push(csvRow(["Libellé", "Dates", "Qtés", "CU", "CT", "Dates", "Qtés", "CU", "CT", "Dates", "Qtés", "CU", "CT"]))
  for (const r of rows) {
    lines.push(csvRow([
      r.label,
      r.entreeQty !== null ? r.date : "-", r.entreeQty !== null ? fmt(r.entreeQty) : "-", r.entreeCU !== null ? fmt(r.entreeCU) : "-", r.entreeCT !== null ? fmt(r.entreeCT) : "-",
      r.sortieQty !== null ? r.date : "-", r.sortieQty !== null ? fmt(r.sortieQty) : "-", r.sortieCU !== null ? fmt(r.sortieCU) : "-", r.sortieCT !== null ? fmt(r.sortieCT) : "-",
      r.date, fmt(r.stockQty), fmt(r.stockCU), fmt(r.stockCT),
    ]))
  }
  lines.push(csvRow(["TOTAL", "31/12", fmt(totals.entreeQty), "-", fmt(totals.entreeCT), "31/12", fmt(totals.sortieQty), "-", fmt(totals.sortieCT), "31/12", fmt(totals.stockQty), "-", fmt(totals.stockCT)]))
  downloadCSV(`fiche-stock-${productName.replace(/\s+/g, "-")}-${year}.csv`, lines)
}

async function downloadFichePDF(rows: FicheRow[], totals: ReturnType<typeof computeFicheDeStock>["totals"], productName: string, year: number, companyName: string, companyAddress: string) {
  const { default: jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default
  const fmt = (n: number) => formatNumber(n, n % 1 !== 0 ? 2 : 0)

  const doc = new jsPDF({ orientation: "landscape" })
  doc.setFontSize(12)
  doc.text(`ENTREPRISE ${companyName}`, 14, 14)
  doc.setFontSize(9)
  doc.text(companyAddress, 14, 19)
  doc.setFontSize(10)
  doc.text(`Année : ${year}`, 250, 14)
  doc.text(`Produit : ${productName}`, 250, 19)
  doc.setFontSize(11)
  doc.text("FICHE DE STOCK — Méthode du coût moyen pondéré (CUMP)", 14, 28)

  autoTable(doc, {
    startY: 33,
    head: [
      [{ content: "ENTRÉES", colSpan: 4, styles: { halign: "center", fillColor: [17, 24, 39] } }, { content: "SORTIES", colSpan: 4, styles: { halign: "center", fillColor: [17, 24, 39] } }, { content: "STOCKS", colSpan: 4, styles: { halign: "center", fillColor: [17, 24, 39] } }],
      ["Dates", "Qtés", "CU", "CT", "Dates", "Qtés", "CU", "CT", "Dates", "Qtés", "CU", "CT"],
    ],
    body: rows.map((r) => [
      r.entreeQty !== null ? r.date : "-", r.entreeQty !== null ? fmt(r.entreeQty) : "-", r.entreeCU !== null ? fmt(r.entreeCU) : "-", r.entreeCT !== null ? fmt(r.entreeCT) : "-",
      r.sortieQty !== null ? r.date : "-", r.sortieQty !== null ? fmt(r.sortieQty) : "-", r.sortieCU !== null ? fmt(r.sortieCU) : "-", r.sortieCT !== null ? fmt(r.sortieCT) : "-",
      r.date, fmt(r.stockQty), fmt(r.stockCU), fmt(r.stockCT),
    ]),
    foot: [["31/12", fmt(totals.entreeQty), "-", fmt(totals.entreeCT), "31/12", fmt(totals.sortieQty), "-", fmt(totals.sortieCT), "31/12", fmt(totals.stockQty), "-", fmt(totals.stockCT)]],
    styles: { fontSize: 8, halign: "center" },
    footStyles: { fillColor: [241, 245, 249], textColor: [17, 24, 39], fontStyle: "bold" },
  })

  doc.save(`fiche-stock-${productName.replace(/\s+/g, "-")}-${year}.pdf`)
}

// ─────────────────────────────────────────────
// Export CSV mis en forme pour la valorisation
// ─────────────────────────────────────────────

function downloadValorisationCSV(categoryRows: CategoryRow[], totalSell: number, canSeeBuyPrice: boolean, companyName: string) {
  const totalQty = categoryRows.reduce((s, r) => s + r.qty, 0)
  const totalBuy = categoryRows.reduce((s, r) => s + r.buyValue, 0)
  const fmt = (n: number) => formatNumber(n, 2)

  const lines: string[] = []
  lines.push(csvRow([`Valorisation du stock — ${companyName}`]))
  lines.push(csvRow([`Généré le ${new Date().toLocaleString("fr-FR")}`]))
  lines.push("")
  lines.push(csvRow(["Catégorie", "Nb produits", "Quantité totale", ...(canSeeBuyPrice ? ["Valeur achat"] : []), "Valeur vente", "% du total"]))
  for (const r of categoryRows) {
    const pct = totalSell > 0 ? Math.round((r.sellValue / totalSell) * 100) : 0
    lines.push(csvRow([r.name, r.count, r.qty, ...(canSeeBuyPrice ? [fmt(r.buyValue)] : []), fmt(r.sellValue), `${pct}%`]))
  }
  lines.push("")
  lines.push(csvRow(["TOTAL", "", totalQty, ...(canSeeBuyPrice ? [fmt(totalBuy)] : []), fmt(totalSell), "100%"]))
  downloadCSV("valorisation-stock.csv", lines)
}

const cardStyle: React.CSSProperties = { background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }
const thStyle: React.CSSProperties = { padding: "10px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 600, color: "#64748b" }
const tdStyle: React.CSSProperties = { padding: "11px 16px", fontSize: 13 }
const exportBtnStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "white", background: "#111827", border: "none", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontWeight: 600 }

export default function RapportsClient({
  categoryRows, productRows, movementRows, bilanMovementRows, logRows, defectiveSummary, defectiveMovementRows, currency, companyName, companyAddress, canSeeAudit, canSeeBuyPrice,
}: {
  categoryRows: CategoryRow[]
  productRows: ProductRow[]
  movementRows: MovementRow[]
  bilanMovementRows: BilanMovementRow[]
  logRows: LogRow[]
  defectiveSummary: DefectiveSummary | null
  defectiveMovementRows: DefectiveMovementRow[]
  currency: string
  companyName: string
  companyAddress: string
  canSeeAudit: boolean
  canSeeBuyPrice: boolean
}) {
  const [tab, setTab] = useState<Tab>("valorisation")
  const totalSell = categoryRows.reduce((s, r) => s + r.sellValue, 0)

  const currentYear = new Date().getFullYear()
  const [selectedProductId, setSelectedProductId] = useState(productRows[0]?.id ?? "")
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const selectedProduct = productRows.find((p) => p.id === selectedProductId)

  const fiche = useMemo(() => {
    if (!selectedProduct || selectedProduct.buyPrice === null) return null
    return computeFicheDeStock(bilanMovementRows, selectedProductId, selectedProduct.buyPrice, selectedYear)
  }, [bilanMovementRows, selectedProductId, selectedProduct, selectedYear])

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "valorisation", label: "Valorisation du stock", icon: BarChart3 },
    { id: "repartition", label: "Répartition par catégorie", icon: PieIcon },
    { id: "mouvements", label: "Rapport de mouvements", icon: Repeat2 },
    ...(canSeeBuyPrice ? [{ id: "bilan" as Tab, label: "Bilan produit", icon: FileSpreadsheet }] : []),
    ...(canSeeBuyPrice && defectiveSummary ? [{ id: "defectueux" as Tab, label: "Pertes stock défectueux", icon: AlertOctagon }] : []),
    ...(canSeeAudit ? [{ id: "audit" as Tab, label: "Rapport d'audit", icon: Shield }] : []),
  ]

  return (
    <div className="page-enter" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Rapports</h1>
        <p style={{ fontSize: 13, color: "#64748b", margin: "2px 0 0" }}>Analyse et export de données</p>
      </div>

      {/* Desktop : boutons horizontaux */}
      <div className="tabs-bar-desktop" style={{ display: "flex", gap: 6, width: "fit-content", flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, border: "none", background: tab === t.id ? "#dc2626" : "#111827", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.15s ease" }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Mobile : menu déroulant */}
      <div className="tabs-select-mobile">
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value as any)}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "#111827",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 14px center",
            paddingRight: 40,
          }}
        >
          {tabs.map((t) => (
            <option key={t.id} value={t.id} style={{ background: "#111827", color: "white" }}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {tab === "valorisation" && (
        <div style={cardStyle}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Valorisation par catégorie</h2>
            <button onClick={() => downloadValorisationCSV(categoryRows, totalSell, canSeeBuyPrice, companyName)} style={exportBtnStyle}>
              <Download size={13} /> Export CSV
            </button>
          </div>
          <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Catégorie", "Nb produits", "Quantité totale", ...(canSeeBuyPrice ? ["Valeur (achat)"] : []), "Valeur (vente)", "% du total"].map((h) => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {categoryRows.map((r, i) => {
                const pct = totalSell > 0 ? Math.round((r.sellValue / totalSell) * 100) : 0
                return (
                  <tr key={r.name} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{r.name}</td>
                    <td style={{ ...tdStyle, color: "#64748b" }}>{r.count}</td>
                    <td style={tdStyle}>{r.qty}</td>
                    {canSeeBuyPrice && <td style={{ ...tdStyle, fontWeight: 600 }}>{formatMoney(r.buyValue, currency)}</td>}
                    <td style={{ ...tdStyle, fontWeight: 700, color: "#111827" }}>{formatMoney(r.sellValue, currency)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 4, background: "#f1f5f9", borderRadius: 99, maxWidth: 80 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "#111827", borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {categoryRows.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucune donnée</td></tr>}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {tab === "repartition" && (
        <div style={{ ...cardStyle, padding: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px" }}>Répartition de la valeur du stock par catégorie</h2>
          {categoryRows.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94a3b8" }}>Aucune donnée</p>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie data={categoryRows} dataKey="sellValue" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={(e) => `${e.name} (${totalSell > 0 ? Math.round((e.sellValue / totalSell) * 100) : 0}%)`}>
                  {categoryRows.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {tab === "mouvements" && (
        <div style={cardStyle}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Mouvements ({movementRows.length} derniers)</h2>
            <button
              onClick={() => downloadCSV("rapport-mouvements.csv", [
                csvRow([`Rapport de mouvements — ${companyName}`]),
                csvRow([`Généré le ${new Date().toLocaleString("fr-FR")}`]),
                "",
                csvRow(["Date", "Type", "Produit", "Quantité", "Entrepôt", "Vers", "Utilisateur", "Motif"]),
                ...movementRows.map((r) => csvRow([r.date, r.type, r.product, formatNumber(r.quantity), r.warehouse, r.destWarehouse ?? "", r.user, r.reason])),
              ])}
              style={exportBtnStyle}
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                  {["Date", "Type", "Produit", "Quantité", "Entrepôt", "Utilisateur", "Motif"].map((h) => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {movementRows.map((m, i) => (
                  <tr key={i} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                    <td style={{ ...tdStyle, fontSize: 12, color: "#64748b" }}>{m.date}</td>
                    <td style={tdStyle}>{m.type}</td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{m.product}</td>
                    <td style={tdStyle}>{m.quantity}</td>
                    <td style={tdStyle}>{m.warehouse}{m.destWarehouse ? ` → ${m.destWarehouse}` : ""}</td>
                    <td style={tdStyle}>{m.user}</td>
                    <td style={{ ...tdStyle, color: "#64748b" }}>{m.reason}</td>
                  </tr>
                ))}
                {movementRows.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun mouvement</td></tr>}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {tab === "bilan" && canSeeBuyPrice && (
        <div style={cardStyle}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Fiche de stock — Bilan par produit et par année</h2>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0" }}>Méthode du coût moyen pondéré (CUMP)</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12.5, maxWidth: 220 }}>
                {productRows.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} style={{ width: 90, padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12.5 }} />
              {fiche && (
                <>
                  <button onClick={() => downloadFicheCSV(fiche.rows, fiche.totals, selectedProduct?.name ?? "produit", selectedYear, companyName)} style={exportBtnStyle}>
                    <Download size={13} /> CSV
                  </button>
                  <button onClick={() => downloadFichePDF(fiche.rows, fiche.totals, selectedProduct?.name ?? "produit", selectedYear, companyName, companyAddress)} style={{ ...exportBtnStyle, background: "#dc2626" }}>
                    <Download size={13} /> Exporter en PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {!fiche ? (
            <p style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Sélectionne un produit</p>
          ) : (
            <>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", fontSize: 12.5, color: "#64748b" }}>
                <strong style={{ color: "#0f172a" }}>ENTREPRISE {companyName}</strong> — {companyAddress}
                <br />
                Année : <strong style={{ color: "#0f172a" }}>{selectedYear}</strong> · Produit : <strong style={{ color: "#0f172a" }}>{selectedProduct?.name}</strong>
              </div>
              <div style={{ maxHeight: 520, overflowY: "auto", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr style={{ background: "#111827" }}>
                      <th colSpan={4} style={{ ...thStyle, color: "white", textAlign: "center" }}>ENTRÉES</th>
                      <th colSpan={4} style={{ ...thStyle, color: "white", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.2)" }}>SORTIES</th>
                      <th colSpan={4} style={{ ...thStyle, color: "white", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.2)" }}>STOCKS</th>
                    </tr>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Dates", "Qtés", "CU", "CT", "Dates", "Qtés", "CU", "CT", "Dates", "Qtés", "CU", "CT"].map((h, i) => (
                        <th key={i} style={{ ...thStyle, textAlign: "center" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fiche.rows.map((r, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #f1f5f9", background: r.kind === "SI" ? "#f8fafc" : "white" }}>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{r.entreeQty !== null ? r.date : "-"}</td>
                        <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600, color: "#16a34a" }}>{r.entreeQty !== null ? r.entreeQty : "-"}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{r.entreeCU !== null ? formatMoney(r.entreeCU, currency) : "-"}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{r.entreeCT !== null ? formatMoney(r.entreeCT, currency) : "-"}</td>
                        <td style={{ ...tdStyle, textAlign: "center", borderLeft: "1px solid #f1f5f9" }}>{r.sortieQty !== null ? r.date : "-"}</td>
                        <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600, color: "#dc2626" }}>{r.sortieQty !== null ? r.sortieQty : "-"}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{r.sortieCU !== null ? formatMoney(r.sortieCU, currency) : "-"}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{r.sortieCT !== null ? formatMoney(r.sortieCT, currency) : "-"}</td>
                        <td style={{ ...tdStyle, textAlign: "center", borderLeft: "1px solid #f1f5f9", fontWeight: r.kind === "SI" ? 700 : 400 }}>{r.date}</td>
                        <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{r.stockQty}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{formatMoney(r.stockCU, currency)}</td>
                        <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{formatMoney(r.stockCT, currency)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid #111827", background: "#f8fafc", fontWeight: 700 }}>
                      <td style={{ ...tdStyle, textAlign: "center" }}>31/12</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{fiche.totals.entreeQty}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>-</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{formatMoney(fiche.totals.entreeCT, currency)}</td>
                      <td style={{ ...tdStyle, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>31/12</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{fiche.totals.sortieQty}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>-</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{formatMoney(fiche.totals.sortieCT, currency)}</td>
                      <td style={{ ...tdStyle, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>31/12</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{fiche.totals.stockQty}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>-</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{formatMoney(fiche.totals.stockCT, currency)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p style={{ padding: "10px 20px", fontSize: 11, color: "#94a3b8", margin: 0, borderTop: "1px solid #f1f5f9" }}>
                CU = coût unitaire moyen pondéré, recalculé après chaque entrée. CT = coût total (Qté × CU). Le CU des entrées utilise le prix d'achat actuel du produit (pas d'historique de coût par réception pour l'instant).
              </p>
            </>
          )}
        </div>
      )}

      {tab === "defectueux" && defectiveSummary && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="responsive-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            <div style={{ ...cardStyle, padding: "16px 18px" }}>
              <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>Déclaré défectueux (cumul)</div>
              <div style={{ fontSize: 19, fontWeight: 700, marginTop: 4 }}>{formatMoney(defectiveSummary.declaredValue, currency)}</div>
            </div>
            <div style={{ ...cardStyle, padding: "16px 18px" }}>
              <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>Réparé (perte annulée)</div>
              <div style={{ fontSize: 19, fontWeight: 700, marginTop: 4, color: "#16a34a" }}>{formatMoney(defectiveSummary.restoredValue, currency)}</div>
            </div>
            <div style={{ ...cardStyle, padding: "16px 18px" }}>
              <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>Vendu à prix réduit</div>
              <div style={{ fontSize: 19, fontWeight: 700, marginTop: 4 }}>{formatMoney(defectiveSummary.soldRevenue, currency)}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{defectiveSummary.soldQty} unités récupérées partiellement</div>
            </div>
            <div style={{ ...cardStyle, padding: "16px 18px", background: "#fef2f2", borderColor: "#fecaca" }}>
              <div style={{ fontSize: 11.5, color: "#991b1b", fontWeight: 600 }}>Perte nette réalisée</div>
              <div style={{ fontSize: 19, fontWeight: 700, marginTop: 4, color: "#dc2626" }}>{formatMoney(defectiveSummary.realizedLoss, currency)}</div>
              <div style={{ fontSize: 11, color: "#991b1b" }}>Vente à prix réduit (manque à gagner) + rebut total</div>
            </div>
          </div>

          <div style={{ ...cardStyle, padding: "14px 20px", fontSize: 12.5, color: "#64748b" }}>
            <strong style={{ color: "#0f172a" }}>{formatMoney(defectiveSummary.currentDefectiveValue, currency)}</strong> de stock défectueux n'est pas encore résolu (ni restauré, ni vendu, ni mis au rebut) — valeur encore incertaine, pas comptée dans la perte nette ci-dessus.
          </div>

          <div style={cardStyle}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Historique des mouvements défectueux ({defectiveMovementRows.length} derniers)</h2>
              <button
                onClick={() => downloadCSV("pertes-stock-defectueux.csv", [
                  csvRow([`Pertes sur stock défectueux — ${companyName}`]),
                  csvRow([`Généré le ${new Date().toLocaleString("fr-FR")}`]),
                  "",
                  csvRow(["Déclaré défectueux (cumul)", formatNumber(defectiveSummary.declaredValue, 2)]),
                  csvRow(["Réparé (perte annulée)", formatNumber(defectiveSummary.restoredValue, 2)]),
                  csvRow(["Vendu à prix réduit (revenu)", formatNumber(defectiveSummary.soldRevenue, 2)]),
                  csvRow(["Perte nette réalisée", formatNumber(defectiveSummary.realizedLoss, 2)]),
                  csvRow(["Non résolu (en attente)", formatNumber(defectiveSummary.currentDefectiveValue, 2)]),
                  "",
                  csvRow(["Date", "Type", "Produit", "Quantité", "Coût unitaire", "Prix de vente", "Impact"]),
                  ...defectiveMovementRows.map((m) => {
                    const impact = m.type === "RESTORE" ? m.cost : m.type === "SELL_DEFECTIVE" ? (m.revenue ?? 0) - m.cost : m.type === "SCRAP" ? -m.cost : 0
                    const typeLabel = m.type === "DEFECTIVE" ? "Déclaré défectueux" : m.type === "RESTORE" ? "Réparé" : m.type === "SELL_DEFECTIVE" ? "Vendu (réduit)" : "Mis au rebut"
                    return csvRow([m.date, typeLabel, m.product, formatNumber(m.quantity), formatNumber(m.unitCost, 2), m.unitPrice !== null ? formatNumber(m.unitPrice, 2) : "-", formatNumber(impact, 2)])
                  }),
                ])}
                style={exportBtnStyle}
              >
                <Download size={13} /> Export CSV
              </button>
            </div>
            <div style={{ maxHeight: 420, overflowY: "auto" }}>
              <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                    {["Date", "Type", "Produit", "Qté", "Coût unitaire", "Prix de vente", "Impact"].map((h) => <th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {defectiveMovementRows.map((m, i) => {
                    const impact = m.type === "RESTORE" ? m.cost : m.type === "SELL_DEFECTIVE" ? (m.revenue ?? 0) - m.cost : m.type === "SCRAP" ? -m.cost : 0
                    return (
                      <tr key={i} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                        <td style={{ ...tdStyle, fontSize: 12, color: "#64748b" }}>{m.date}</td>
                        <td style={tdStyle}>{m.type === "DEFECTIVE" ? "Déclaré défectueux" : m.type === "RESTORE" ? "Réparé" : m.type === "SELL_DEFECTIVE" ? "Vendu (réduit)" : "Mis au rebut"}</td>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{m.product}</td>
                        <td style={tdStyle}>{m.quantity}</td>
                        <td style={tdStyle}>{formatMoney(m.unitCost, currency)}</td>
                        <td style={tdStyle}>{m.unitPrice !== null ? formatMoney(m.unitPrice, currency) : "-"}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: impact > 0 ? "#16a34a" : impact < 0 ? "#dc2626" : "#94a3b8" }}>
                          {impact === 0 ? "-" : `${impact > 0 ? "+" : ""}${formatMoney(impact, currency)}`}
                        </td>
                      </tr>
                    )
                  })}
                  {defectiveMovementRows.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun mouvement de stock défectueux</td></tr>}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "audit" && canSeeAudit && (
        <div style={cardStyle}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Traçabilité complète ({logRows.length} derniers évènements)</h2>
            <button
              onClick={() => downloadCSV("rapport-audit.csv", [
                csvRow([`Rapport d'audit — ${companyName}`]),
                csvRow([`Généré le ${new Date().toLocaleString("fr-FR")}`]),
                "",
                csvRow(["Date", "Utilisateur", "Action", "Module", "Détail"]),
                ...logRows.map((r) => csvRow([r.date, r.user, r.action, r.module, r.detail])),
              ])}
              style={exportBtnStyle}
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                  {["Date / Heure", "Utilisateur", "Action", "Module", "Détail"].map((h) => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {logRows.map((l, i) => (
                  <tr key={i} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                    <td style={{ ...tdStyle, fontSize: 12, color: "#64748b", fontFamily: "monospace", whiteSpace: "nowrap" }}>{l.date}</td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{l.user}</td>
                    <td style={tdStyle}>{l.action}</td>
                    <td style={tdStyle}><span style={{ padding: "2px 8px", borderRadius: 20, background: "#f1f5f9", color: "#475569", fontSize: 12 }}>{l.module}</span></td>
                    <td style={{ ...tdStyle, color: "#64748b" }}>{l.detail}</td>
                  </tr>
                ))}
                {logRows.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucune activité</td></tr>}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

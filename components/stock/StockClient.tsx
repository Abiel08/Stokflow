"use client"

import { useState, useRef } from "react"
import { Search, Plus, ArrowDown, ArrowUp, Repeat2, AlertOctagon, Check, X as XIcon } from "lucide-react"
import { createInMovement, createOutMovement, createTransfer, submitInventoryCount, declareDefective, restoreDefective, sellDefective, scrapDefective, validateInventoryCount, rejectInventoryCount } from "@/app/(dashboard)/stock/actions"
import { useToast } from "@/components/toast/ToastProvider"

type Tab = "liste" | "historique" | "entree" | "sortie" | "transfert" | "declarer-defectueux" | "gerer-defectueux" | "inventaire"

interface StockRow { id: string; product: { id: string; name: string; reference: string; minQty: number }; warehouse: { id: string; name: string }; quantity: number }
interface DefectiveRow { id: string; product: { id: string; name: string; reference: string }; warehouse: { id: string; name: string }; quantity: number }
interface Ref { id: string; name: string; reference?: string }
interface MovementRow { id: string; type: string; productName: string; warehouseName: string; destWarehouseName: string | null; quantity: number; userName: string; reason: string | null; createdAt: string }
interface InventoryRow { id: string; productName: string; warehouseName: string; theoreticalQty: number; countedQty: number; difference: number; submittedByName: string; validatedByName: string | null; validatedAt: string | null; createdAt: string }

const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }
const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }

function statusOf(qty: number, min: number) {
  if (qty <= 0) return { label: "Rupture", bg: "#fef2f2", color: "#dc2626" }
  if (qty <= min) return { label: "Alerte", bg: "#fffbeb", color: "#d97706" }
  return { label: "OK", bg: "#f0fdf4", color: "#16a34a" }
}

const movementLabels: Record<string, { label: string; bg: string; color: string; icon: any }> = {
  IN: { label: "Entrée", bg: "#f0fdf4", color: "#16a34a", icon: ArrowDown },
  OUT: { label: "Sortie", bg: "#fef2f2", color: "#dc2626", icon: ArrowUp },
  TRANSFER: { label: "Transfert", bg: "#eff6ff", color: "#2563eb", icon: Repeat2 },
  DEFECTIVE: { label: "Déclaré défectueux", bg: "#fff7ed", color: "#ea580c", icon: AlertOctagon },
  RESTORE: { label: "Réparé", bg: "#f0fdf4", color: "#16a34a", icon: Check },
  SELL_DEFECTIVE: { label: "Vendu (défectueux)", bg: "#fef9c3", color: "#a16207", icon: ArrowUp },
  SCRAP: { label: "Mis au rebut", bg: "#f1f5f9", color: "#64748b", icon: XIcon },
}

export default function StockClient({
  stocks, defectiveStocks, products, warehouses, movements, inventoryCounts,
  canWrite, canDefective, canSubmitInventory, canValidateInventory,
}: {
  stocks: StockRow[]
  defectiveStocks: DefectiveRow[]
  products: Ref[]
  warehouses: Ref[]
  movements: MovementRow[]
  inventoryCounts: InventoryRow[]
  canWrite: boolean
  canDefective: boolean
  canSubmitInventory: boolean
  canValidateInventory: boolean
}) {
  const [tab, setTab] = useState<Tab>("liste")
  const [search, setSearch] = useState("")
  const [defectiveAction, setDefectiveAction] = useState<"restore" | "sell" | "scrap">("restore")
  const { showToast } = useToast()
  const entreeSortieRef = useRef<HTMLFormElement>(null)
  const transfertRef = useRef<HTMLFormElement>(null)
  const defectiveRef = useRef<HTMLFormElement>(null)
  const declareRef = useRef<HTMLFormElement>(null)
  const inventaireRef = useRef<HTMLFormElement>(null)

  const filteredStocks = stocks.filter((s) => s.product.name.toLowerCase().includes(search.toLowerCase()) || s.product.reference.toLowerCase().includes(search.toLowerCase()))
  const pendingInventories = inventoryCounts.filter((c) => !c.validatedAt)
  const treatedInventories = inventoryCounts.filter((c) => c.validatedAt)

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "liste", label: "Liste du stock" },
    { id: "historique", label: "Historique" },
    ...(canWrite ? [{ id: "entree" as Tab, label: "Entrée de stock" }, { id: "sortie" as Tab, label: "Sortie de stock" }, { id: "transfert" as Tab, label: "Transfert" }] : []),
    ...(canDefective ? [{ id: "declarer-defectueux" as Tab, label: "Déclarer défectueux" }, { id: "gerer-defectueux" as Tab, label: "Gérer le stock défectueux" }] : []),
    ...(canSubmitInventory || canValidateInventory ? [{ id: "inventaire" as Tab, label: "Inventaire", badge: canValidateInventory ? pendingInventories.length : undefined }] : []),
  ]

  return (
    <div className="page-enter" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Gestion du stock</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "2px 0 0" }}>{products.length} produits · {warehouses.length} entrepôts</p>
        </div>
        {canWrite && (
          <button onClick={() => setTab("entree")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#111827", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={15} /> Entrée de stock
          </button>
        )}
      </div>

      {/* Desktop : boutons horizontaux */}
      <div className="tabs-bar-desktop" style={{ display: "flex", gap: 6, width: "fit-content", flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ position: "relative", padding: "7px 14px", borderRadius: 7, border: "none", background: tab === t.id ? "#dc2626" : "#111827", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.15s ease" }}>
            {t.label}
            {!!t.badge && (
              <span style={{ marginLeft: 6, background: "white", color: "#dc2626", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "1px 6px" }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Mobile : menu déroulant */}
      <div className="tabs-select-mobile">
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value as Tab)}
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
              {t.label}{t.badge ? ` (${t.badge})` : ""}
            </option>
          ))}
        </select>
      </div>

      {tab === "liste" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ position: "relative", maxWidth: 320 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher produit, référence..." style={{ ...inputStyle, paddingLeft: 30 }} />
          </div>
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Produit", "Référence", "Quantité", "Entrepôt", "Statut"].map((h) => <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((s, i) => {
                  const st = statusOf(s.quantity, s.product.minQty)
                  return (
                    <tr key={s.id} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                      <td style={{ padding: "12px 16px", fontSize: 13.5, fontWeight: 600 }}>{s.product.name}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#64748b" }}>{s.product.reference}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>{s.quantity}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>{s.warehouse.name}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ padding: "3px 9px", borderRadius: 20, background: st.bg, color: st.color, fontSize: 11.5, fontWeight: 600 }}>{st.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {tab === "historique" && (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Date", "Type", "Produit", "Quantité", "Entrepôt", "Utilisateur", "Motif"].map((h) => <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {movements.map((m, i) => {
                const ml = movementLabels[m.type] ?? movementLabels.IN
                const Icon = ml.icon
                return (
                  <tr key={m.id} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#64748b" }}>{m.createdAt}</td>
                    <td style={{ padding: "11px 16px", fontSize: 12 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, background: ml.bg, color: ml.color, fontWeight: 600 }}>
                        <Icon size={11} /> {ml.label}
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 500 }}>{m.productName}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13 }}>{m.quantity}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13 }}>{m.warehouseName}{m.destWarehouseName ? ` → ${m.destWarehouseName}` : ""}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13 }}>{m.userName}</td>
                    <td style={{ padding: "11px 16px", fontSize: 12.5, color: "#64748b" }}>{m.reason}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {(tab === "entree" || tab === "sortie") && (
        <form
          ref={entreeSortieRef}
          action={async (fd) => {
            try {
              if (tab === "entree") await createInMovement(fd)
              else await createOutMovement(fd)
              showToast(tab === "entree" ? "Entrée de stock enregistrée avec succès" : "Sortie de stock enregistrée avec succès", "success")
              entreeSortieRef.current?.reset()
            } catch (e: any) {
              showToast(e.message ?? "L'opération a échoué", "error")
            }
          }}
          style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 28, maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{tab === "entree" ? "Entrée de stock" : "Sortie de stock"}</h2>
          <div>
            <label style={labelStyle}>Produit</label>
            <select name="productId" required style={inputStyle}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.reference})</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Entrepôt</label>
            <select name="warehouseId" required style={inputStyle}>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Quantité</label>
            <input name="quantity" type="number" min={1} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Référence (bon de livraison, commande...)</label>
            <input name="reference" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Motif</label>
            <input name="reason" style={inputStyle} />
          </div>
          <button type="submit" style={{ padding: 10, borderRadius: 8, border: "none", background: "#111827", color: "white", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
            Valider {tab === "entree" ? "l'entrée" : "la sortie"}
          </button>
        </form>
      )}

      {tab === "transfert" && (
        <form
          ref={transfertRef}
          action={async (fd) => {
            try {
              await createTransfer(fd)
              showToast("Transfert effectué avec succès", "success")
              transfertRef.current?.reset()
            } catch (e: any) {
              showToast(e.message ?? "Le transfert a échoué", "error")
            }
          }}
          style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 28, maxWidth: 620, display: "flex", flexDirection: "column", gap: 14 }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Transfert entre entrepôts</h2>
          <div>
            <label style={labelStyle}>Produit</label>
            <select name="productId" required style={inputStyle}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.reference})</option>)}
            </select>
          </div>
          <div className="responsive-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "end" }}>
            <div>
              <label style={labelStyle}>Entrepôt source</label>
              <select name="warehouseId" required style={inputStyle}>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <Repeat2 size={20} color="#2563eb" style={{ marginBottom: 10 }} />
            <div>
              <label style={labelStyle}>Entrepôt destination</label>
              <select name="destWarehouseId" required style={inputStyle}>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Quantité</label>
            <input name="quantity" type="number" min={1} required style={inputStyle} />
          </div>
          <button type="submit" style={{ padding: 10, borderRadius: 8, border: "none", background: "#111827", color: "white", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
            Valider le transfert
          </button>
        </form>
      )}

      {tab === "declarer-defectueux" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 28, maxWidth: 480 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>Déclarer un stock défectueux</h2>
            <p style={{ fontSize: 12.5, color: "#64748b", margin: "0 0 20px" }}>Retire la quantité indiquée du stock bon état et la place dans le stock défectueux, en attente de décision.</p>
            <form
              ref={declareRef}
              action={async (fd) => {
                try {
                  await declareDefective(fd)
                  showToast("Stock déclaré défectueux avec succès", "success")
                  declareRef.current?.reset()
                } catch (e: any) {
                  showToast(e.message ?? "Opération impossible", "error")
                }
              }}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div>
                <label style={labelStyle}>Produit</label>
                <select name="productId" required style={inputStyle}>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.reference})</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Entrepôt</label>
                <select name="warehouseId" required style={inputStyle}>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Quantité</label>
                <input name="quantity" type="number" min={1} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Motif</label>
                <input name="reason" placeholder="ex: carton endommagé à la réception" style={inputStyle} />
              </div>
              <button type="submit" style={{ padding: 10, borderRadius: 8, border: "none", background: "#111827", color: "white", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                Déclarer ce stock défectueux
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === "gerer-defectueux" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Stock actuellement défectueux, en attente de décision</h2>
            </div>
            <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Produit", "Référence", "Entrepôt", "Quantité défectueuse"].map((h) => <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {defectiveStocks.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun stock défectueux actuellement</td></tr>
                )}
                {defectiveStocks.map((s, i) => (
                  <tr key={s.id} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 500 }}>{s.product.name}</td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#64748b" }}>{s.product.reference}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13 }}>{s.warehouse.name}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13 }}>
                      <span style={{ padding: "3px 9px", borderRadius: 20, background: "#fff7ed", color: "#ea580c", fontSize: 12, fontWeight: 700 }}>{s.quantity}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 28, maxWidth: 520 }}>
            <p style={{ fontSize: 12.5, color: "#64748b", margin: "0 0 16px" }}>Pour chaque lot de stock défectueux ci-dessus, choisis son issue :</p>
            <div className="btn-group" style={{ display: "flex", gap: 6, marginBottom: 20, width: "fit-content", flexWrap: "wrap" }}>
              {[
                { id: "restore", label: "Réparer (bon état)" },
                { id: "sell", label: "Vendre à prix réduit" },
                { id: "scrap", label: "Mettre au rebut" },
              ].map((a) => (
                <button key={a.id} onClick={() => setDefectiveAction(a.id as any)} style={{ padding: "6px 13px", borderRadius: 7, border: "none", background: defectiveAction === a.id ? "#dc2626" : "#111827", color: "white", fontSize: 12.5, fontWeight: 600, cursor: "pointer", transition: "background 0.15s ease" }}>
                  {a.label}
                </button>
              ))}
            </div>

            <form
              ref={defectiveRef}
              action={async (fd) => {
                try {
                  if (defectiveAction === "restore") { await restoreDefective(fd); showToast("Réparation enregistrée : produit remis en bon état", "success") }
                  else if (defectiveAction === "sell") { await sellDefective(fd); showToast("Vente enregistrée avec succès", "success") }
                  else { await scrapDefective(fd); showToast("Stock mis au rebut avec succès", "success") }
                  defectiveRef.current?.reset()
                } catch (e: any) {
                  showToast(e.message ?? "Opération impossible", "error")
                }
              }}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div>
                <label style={labelStyle}>Produit</label>
                <select name="productId" required style={inputStyle}>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.reference})</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Entrepôt</label>
                <select name="warehouseId" required style={inputStyle}>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Quantité</label>
                <input name="quantity" type="number" min={1} required style={inputStyle} />
              </div>
              {defectiveAction === "sell" && (
                <div>
                  <label style={labelStyle}>Prix de vente unitaire (réduit)</label>
                  <input name="unitPrice" type="number" step="0.01" min={0} required style={inputStyle} />
                </div>
              )}
              <div>
                <label style={labelStyle}>Motif</label>
                <input name="reason" placeholder="ex: carton endommagé à la réception" style={inputStyle} />
              </div>
              <button type="submit" style={{ padding: 10, borderRadius: 8, border: "none", background: "#111827", color: "white", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                {defectiveAction === "restore" && "Confirmer la réparation"}
                {defectiveAction === "sell" && "Enregistrer la vente"}
                {defectiveAction === "scrap" && "Confirmer la mise au rebut"}
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === "inventaire" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {canSubmitInventory && (
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 28, maxWidth: 480 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>Faire un comptage</h2>
              <p style={{ fontSize: 12.5, color: "#64748b", margin: "0 0 18px" }}>Le comptage est enregistré avec la date et reste en attente — il ne modifie pas le stock tant qu'un administrateur ne l'a pas validé.</p>
              <form
                ref={inventaireRef}
                action={async (fd) => {
                  const productId = String(fd.get("productId"))
                  const warehouseId = String(fd.get("warehouseId"))
                  const countedQty = Number(fd.get("countedQty"))
                  try {
                    await submitInventoryCount(productId, warehouseId, countedQty)
                    showToast("Comptage soumis, en attente de validation", "success")
                    inventaireRef.current?.reset()
                  } catch (e: any) {
                    showToast(e.message ?? "La soumission a échoué", "error")
                  }
                }}
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div>
                  <label style={labelStyle}>Produit</label>
                  <select name="productId" required style={inputStyle}>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.reference})</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Entrepôt</label>
                  <select name="warehouseId" required style={inputStyle}>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Quantité comptée</label>
                  <input name="countedQty" type="number" min={0} required style={inputStyle} />
                </div>
                <button type="submit" style={{ padding: 10, borderRadius: 8, border: "none", background: "#111827", color: "white", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                  Soumettre le comptage
                </button>
              </form>
            </div>
          )}

          {canValidateInventory && (
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Inventaires en attente de validation</h2>
              </div>
              <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Date", "Produit", "Entrepôt", "Théorique", "Compté", "Écart", "Soumis par", ""].map((h) => <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {pendingInventories.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun inventaire en attente</td></tr>
                  )}
                  {pendingInventories.map((c, i) => (
                    <tr key={c.id} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "#64748b" }}>{c.createdAt}</td>
                      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 500 }}>{c.productName}</td>
                      <td style={{ padding: "11px 16px", fontSize: 13 }}>{c.warehouseName}</td>
                      <td style={{ padding: "11px 16px", fontSize: 13 }}>{c.theoreticalQty}</td>
                      <td style={{ padding: "11px 16px", fontSize: 13 }}>{c.countedQty}</td>
                      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: c.difference === 0 ? "#94a3b8" : c.difference > 0 ? "#16a34a" : "#dc2626" }}>
                        {c.difference > 0 ? `+${c.difference}` : c.difference}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 12.5, color: "#64748b" }}>{c.submittedByName}</td>
                      <td style={{ padding: "11px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={async () => { try { await validateInventoryCount(c.id); showToast("Inventaire validé, stock mis à jour", "success") } catch (e: any) { showToast(e.message ?? "Erreur", "error") } }}
                            style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "#111827", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                          >
                            Valider
                          </button>
                          <button
                            onClick={async () => { if (confirm("Rejeter ce comptage ? Le stock ne sera pas modifié.")) { try { await rejectInventoryCount(c.id); showToast("Inventaire rejeté", "success") } catch (e: any) { showToast(e.message ?? "Erreur", "error") } } }}
                            style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                          >
                            Rejeter
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Historique des inventaires traités</h2>
            </div>
            <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Date", "Produit", "Entrepôt", "Écart appliqué", "Soumis par", "Validé par"].map((h) => <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {treatedInventories.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun inventaire validé pour l'instant</td></tr>
                )}
                {treatedInventories.map((c, i) => (
                  <tr key={c.id} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#64748b" }}>{c.createdAt}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 500 }}>{c.productName}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13 }}>{c.warehouseName}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: c.difference === 0 ? "#94a3b8" : c.difference > 0 ? "#16a34a" : "#dc2626" }}>
                      {c.difference > 0 ? `+${c.difference}` : c.difference}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12.5, color: "#64748b" }}>{c.submittedByName}</td>
                    <td style={{ padding: "11px 16px", fontSize: 12.5, color: "#64748b" }}>{c.validatedByName} · {c.validatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

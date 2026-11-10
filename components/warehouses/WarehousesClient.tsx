"use client"

import { useState } from "react"
import { Plus, Pencil, MapPin, Trash2, X, UserCircle2 } from "lucide-react"
import { createWarehouse, updateWarehouse, deleteWarehouse, updateWarehouseManagers } from "@/app/(dashboard)/entrepots/actions"
import { useToast } from "@/components/toast/ToastProvider"

interface Warehouse {
  id: string
  name: string
  address: string | null
  capacity: number
  used: number
  managerIds: string[]
  managerNames: string[]
  productsCount: number
  storekeepersCount: number
  possibleManagers: { id: string; name: string }[]
}

const inputStyle: React.CSSProperties = { padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }

function ManagersEditor({ warehouse, showToast }: { warehouse: Warehouse; showToast: (m: string, t?: "success" | "error") => void }) {
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<string[]>(warehouse.managerIds)

  if (warehouse.possibleManagers.length === 0) {
    return <span style={{ fontSize: 12, color: "#94a3b8" }}>Aucun magasinier rattaché — affecte-en un depuis Utilisateurs</span>
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{warehouse.managerNames.join(", ") || "Aucun responsable"}</span>
        <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 600 }}>Modifier</span>
      </button>
    )
  }

  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
        {warehouse.possibleManagers.map((u) => (
          <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={selected.includes(u.id)}
              onChange={(e) => setSelected((prev) => (e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)))}
            />
            {u.name}
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={async () => {
            try {
              await updateWarehouseManagers(warehouse.id, selected)
              showToast("Responsables mis à jour avec succès", "success")
              setEditing(false)
            } catch (err: any) {
              showToast(err.message ?? "Affectation impossible", "error")
            }
          }}
          style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, border: "none", background: "#111827", color: "white", cursor: "pointer" }}
        >
          OK
        </button>
        <button onClick={() => { setSelected(warehouse.managerIds); setEditing(false) }} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}>
          Annuler
        </button>
      </div>
    </div>
  )
}

function WarehouseModal({
  warehouse, onClose, showToast,
}: {
  warehouse?: Warehouse
  onClose: () => void
  showToast: (m: string, t?: "success" | "error") => void
}) {
  const isEdit = !!warehouse
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div className="modal-panel" style={{ background: "white", borderRadius: 16, width: 420 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{isEdit ? "Modifier l'entrepôt" : "Nouvel entrepôt"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <form
          action={async (fd) => {
            try {
              if (isEdit) await updateWarehouse(warehouse.id, fd)
              else await createWarehouse(fd)
              showToast(isEdit ? "Entrepôt modifié avec succès" : "Entrepôt créé avec succès", "success")
              onClose()
            } catch (e: any) {
              showToast(e.message ?? "L'enregistrement a échoué", "error")
            }
          }}
          style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input name="name" required defaultValue={warehouse?.name} placeholder="Nom (ex: Paris – Entrepôt Central)" style={inputStyle} />
          <input name="address" defaultValue={warehouse?.address ?? ""} placeholder="Adresse" style={inputStyle} />
          <input name="capacity" type="number" defaultValue={warehouse?.capacity || undefined} placeholder="Capacité (palettes)" style={inputStyle} />
          {!isEdit && (
            <p style={{ fontSize: 11.5, color: "#94a3b8", margin: 0 }}>
              Les responsables se choisissent après coup, une fois qu'au moins un magasinier a été rattaché à cet entrepôt (page Utilisateurs). Un entrepôt peut avoir plusieurs responsables.
            </p>
          )}
          <button type="submit" style={{ padding: 10, borderRadius: 8, border: "none", background: "#111827", color: "white", fontWeight: 600, cursor: "pointer" }}>
            {isEdit ? "Enregistrer les modifications" : "Créer"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function WarehousesClient({ warehouses, canEdit }: { warehouses: Warehouse[]; canEdit: boolean }) {
  const [showModal, setShowModal] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const { showToast } = useToast()

  return (
    <div className="page-enter" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Entrepôts</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "2px 0 0" }}>{warehouses.length} sites</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#111827", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={15} /> Nouvel entrepôt
          </button>
        )}
      </div>

      {showModal && <WarehouseModal onClose={() => setShowModal(false)} showToast={showToast} />}
      {editingWarehouse && <WarehouseModal warehouse={editingWarehouse} onClose={() => setEditingWarehouse(null)} showToast={showToast} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))", gap: 16 }}>
        {warehouses.map((w) => {
          const pct = w.capacity > 0 ? Math.round((w.used / w.capacity) * 100) : 0
          return (
            <div key={w.id} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{w.name}</div>
                  {w.address && <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b", marginTop: 4 }}><MapPin size={12} />{w.address}</div>}
                </div>
                {canEdit && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => setEditingWarehouse(w)}
                      title="Modifier"
                      style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Supprimer "${w.name}" ?`)) return
                        try {
                          await deleteWarehouse(w.id)
                          showToast("Entrepôt supprimé avec succès", "success")
                        } catch (e: any) {
                          showToast(e.message ?? "Suppression impossible", "error")
                        }
                      }}
                      title="Supprimer"
                      style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #fecaca", background: "#fff5f5", color: "#dc2626", cursor: "pointer" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: "#64748b" }}>Capacité utilisée</span>
                  <span style={{ fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 6, background: "#f1f5f9", borderRadius: 99 }}>
                  <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: pct > 80 ? "#ef4444" : pct > 60 ? "#f97316" : "#22c55e", borderRadius: 99 }} />
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>
                  {w.used.toLocaleString("fr-FR")} / {w.capacity > 0 ? w.capacity.toLocaleString("fr-FR") : "—"} unités
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12, padding: "8px 10px", borderRadius: 8, background: "#fafbfc", border: "1px solid #f1f5f9" }}>
                <UserCircle2 size={16} color="#64748b" style={{ marginTop: 2, flexShrink: 0 }} />
                {canEdit ? (
                  <ManagersEditor warehouse={w} showToast={showToast} />
                ) : (
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{w.managerNames.join(", ") || "Aucun responsable"}</span>
                )}
              </div>

              <div style={{ paddingTop: 14, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#64748b" }}>
                <span>{w.storekeepersCount} magasinier(s)</span>
                <span>{w.productsCount} produits</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

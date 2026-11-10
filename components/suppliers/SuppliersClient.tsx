"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Mail, Phone, MapPin, Building2, X } from "lucide-react"
import { createSupplier, updateSupplier, deleteSupplier } from "@/app/(dashboard)/fournisseurs/actions"
import { useToast } from "@/components/toast/ToastProvider"

interface Supplier { id: string; name: string; contactName: string | null; phone: string | null; email: string | null; address: string | null; _count: { products: number } }

const inputStyle: React.CSSProperties = { padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }

function SupplierModal({ supplier, onClose }: { supplier?: Supplier; onClose: () => void }) {
  const isEdit = !!supplier
  const { showToast } = useToast()
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div className="modal-panel" style={{ background: "white", borderRadius: 16, width: 460 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{isEdit ? "Modifier le fournisseur" : "Nouveau fournisseur"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <form
          action={async (fd) => {
            try {
              if (isEdit) await updateSupplier(supplier.id, fd)
              else await createSupplier(fd)
              showToast(isEdit ? "Fournisseur modifié avec succès" : "Fournisseur créé avec succès", "success")
              onClose()
            } catch (e: any) {
              showToast(e.message ?? "L'enregistrement a échoué", "error")
            }
          }}
          style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input name="name" required defaultValue={supplier?.name} placeholder="Nom de l'entreprise" style={inputStyle} />
          <input name="contactName" defaultValue={supplier?.contactName ?? ""} placeholder="Nom du contact" style={inputStyle} />
          <input name="phone" required defaultValue={supplier?.phone ?? ""} placeholder="Téléphone" style={inputStyle} />
          <input name="email" type="email" required defaultValue={supplier?.email ?? ""} placeholder="Email" style={inputStyle} />
          <input name="address" defaultValue={supplier?.address ?? ""} placeholder="Adresse" style={inputStyle} />
          <button type="submit" style={{ padding: 10, borderRadius: 8, border: "none", background: "#111827", color: "white", fontWeight: 600, cursor: "pointer" }}>
            {isEdit ? "Enregistrer les modifications" : "Créer"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function SuppliersClient({ suppliers, canEdit }: { suppliers: Supplier[]; canEdit: boolean }) {
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const { showToast } = useToast()

  return (
    <div className="page-enter" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Fournisseurs</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "2px 0 0" }}>{suppliers.length} fournisseurs</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#111827", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={15} /> Nouveau fournisseur
          </button>
        )}
      </div>

      {showModal && <SupplierModal onClose={() => setShowModal(false)} />}
      {editingSupplier && <SupplierModal supplier={editingSupplier} onClose={() => setEditingSupplier(null)} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: 14 }}>
        {suppliers.map((s) => (
          <div key={s.id} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Building2 size={20} color="#2563eb" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{s.contactName}</div>
                </div>
              </div>
              {canEdit && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setEditingSupplier(s)} title="Modifier" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}><Pencil size={13} /></button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Supprimer "${s.name}" ?`)) return
                      try {
                        await deleteSupplier(s.id)
                        showToast("Fournisseur supprimé avec succès", "success")
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
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {s.phone && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#64748b" }}><Phone size={13} />{s.phone}</div>}
              {s.email && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#64748b" }}><Mail size={13} />{s.email}</div>}
              {s.address && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#64748b" }}><MapPin size={13} />{s.address}</div>}
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#64748b" }}>
              <strong style={{ color: "#0f172a" }}>{s._count.products}</strong> produits fournis
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

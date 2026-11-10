"use client"

import { useState } from "react"
import { Search, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Users } from "lucide-react"
import { createProduct, updateProduct, deleteProduct, toggleProductActive, createCategory, deleteCategory, assignProductManagers } from "@/app/(dashboard)/produits/actions"
import { formatMoney } from "@/lib/currency"
import { useToast } from "@/components/toast/ToastProvider"

interface Product {
  id: string
  name: string
  reference: string
  categoryId: string | null
  supplierId: string | null
  unit: string
  buyPrice: number | null
  sellPrice: number
  minQty: number
  active: boolean
  category: { id: string; name: string } | null
  supplier: { id: string; name: string } | null
  managerIds: string[]
  managerNames: string[]
}
interface Category { id: string; name: string; _count: { products: number } }
interface Supplier { id: string; name: string }
interface Storekeeper { id: string; name: string }

function ProductModal({
  categories, suppliers, storekeepers, onClose, product, canSeeBuyPrice, existingNames,
}: {
  categories: Category[]
  suppliers: Supplier[]
  storekeepers: Storekeeper[]
  onClose: () => void
  product?: Product
  canSeeBuyPrice: boolean
  existingNames: { id: string; name: string }[]
}) {
  const isEdit = !!product
  const { showToast } = useToast()
  const [nameWarning, setNameWarning] = useState(false)

  const checkDuplicateName = (value: string) => {
    const isDuplicate = existingNames.some(
      (p) => p.name.trim().toLowerCase() === value.trim().toLowerCase() && p.id !== product?.id
    )
    setNameWarning(isDuplicate && value.trim().length > 0)
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div className="modal-panel" style={{ background: "white", borderRadius: 16, width: 560, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{isEdit ? "Modifier le produit" : "Nouveau produit"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
        </div>
        <form
          action={async (formData) => {
            try {
              if (isEdit) await updateProduct(product.id, formData)
              else await createProduct(formData)
              showToast(isEdit ? "Produit modifié avec succès" : "Produit créé avec succès", "success")
              onClose()
            } catch (e: any) {
              showToast(e.message ?? "L'enregistrement a échoué", "error")
            }
          }}
          style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Nom du produit</label>
              <input
                name="name"
                required
                defaultValue={product?.name}
                placeholder="ex: Fer à béton 8mm"
                style={inputStyle}
                onChange={(e) => checkDuplicateName(e.target.value)}
                onBlur={(e) => checkDuplicateName(e.target.value)}
              />
              {nameWarning && (
                <p style={{ fontSize: 11.5, color: "#b45309", margin: "5px 0 0", display: "flex", alignItems: "center", gap: 5 }}>
                  ⚠️ Un produit nommé ainsi existe déjà — vérifie qu'il ne s'agit pas d'un doublon avant d'enregistrer.
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Catégorie</label>
              <select name="categoryId" defaultValue={product?.categoryId ?? ""} style={inputStyle}>
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Fournisseur</label>
              <select name="supplierId" defaultValue={product?.supplierId ?? ""} style={inputStyle}>
                <option value="">—</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {canSeeBuyPrice && (
              <div>
                <label style={labelStyle}>Prix d'achat</label>
                <input name="buyPrice" type="number" step="0.01" min="0" required defaultValue={product?.buyPrice ?? undefined} placeholder="0.00" style={inputStyle} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Prix de vente</label>
              <input name="sellPrice" type="number" step="0.01" min="0" required defaultValue={product?.sellPrice} placeholder="0.00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Unité</label>
              <input name="unit" list="unit-suggestions" required defaultValue={product?.unit ?? "unité"} placeholder="ex: unité, kg, sac, rouleau..." style={inputStyle} />
              <datalist id="unit-suggestions">
                <option value="unité" /><option value="kg" /><option value="sac" /><option value="boîte" />
                <option value="rouleau" /><option value="lot" /><option value="litre" /><option value="barre" /><option value="pot" /><option value="feuille" />
              </datalist>
            </div>
            <div>
              <label style={labelStyle}>Seuil minimum</label>
              <input name="minQty" type="number" min="0" defaultValue={product?.minQty} placeholder="0" style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>
                Magasiniers responsables <span style={{ fontWeight: 400, color: "#94a3b8" }}>(un produit peut être géré par plusieurs magasiniers)</span>
              </label>
              {storekeepers.length === 0 ? (
                <p style={{ fontSize: 12.5, color: "#94a3b8", margin: 0 }}>Aucun magasinier créé pour l'instant.</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
                  {storekeepers.map((s) => (
                    <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, padding: "4px 8px", borderRadius: 6, background: "#f8fafc" }}>
                      <input type="checkbox" name="managerIds" value={s.id} defaultChecked={product?.managerIds.includes(s.id)} /> {s.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13.5, color: "#64748b", cursor: "pointer" }}>Annuler</button>
            <button type="submit" style={{ flex: 2, padding: 10, borderRadius: 8, border: "none", background: "#111827", color: "white", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
              {isEdit ? "Enregistrer les modifications" : "Créer le produit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ManagersCell({ product, storekeepers, canEdit }: { product: Product; storekeepers: Storekeeper[]; canEdit: boolean }) {
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<string[]>(product.managerIds)
  const { showToast } = useToast()

  if (!canEdit) {
    return <span style={{ fontSize: 12.5, color: "#64748b" }}>{product.managerNames.join(", ") || "—"}</span>
  }

  if (editing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
        {storekeepers.map((s) => (
          <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={selected.includes(s.id)}
              onChange={(e) => setSelected((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)))}
            />
            {s.name}
          </label>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <button
            onClick={async () => {
              try {
                await assignProductManagers(product.id, selected)
                showToast("Magasiniers assignés avec succès", "success")
                setEditing(false)
              } catch (e: any) {
                showToast(e.message ?? "L'affectation a échoué", "error")
              }
            }}
            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, border: "none", background: "#111827", color: "white", cursor: "pointer" }}
          >
            OK
          </button>
          <button onClick={() => setEditing(false)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}>Annuler</button>
        </div>
      </div>
    )
  }

  return (
    <button onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#64748b", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
      <Users size={12} /> {product.managerNames.join(", ") || "Assigner..."}
    </button>
  )
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 11px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }

export default function ProductsClient({
  products, categories, suppliers, canEdit, canDelete, canSeeBuyPrice, currency, storekeepers,
}: {
  products: Product[]
  categories: Category[]
  suppliers: Supplier[]
  canEdit: boolean
  canDelete: boolean
  canSeeBuyPrice: boolean
  currency: string
  storekeepers: Storekeeper[]
}) {
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [catFilter, setCatFilter] = useState("all")
  const [search, setSearch] = useState("")
  const { showToast } = useToast()

  const filtered = products.filter((p) =>
    (catFilter === "all" || p.category?.name === catFilter) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.reference.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="page-enter" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      {showModal && <ProductModal categories={categories} suppliers={suppliers} storekeepers={storekeepers} existingNames={products} onClose={() => setShowModal(false)} />}
      {editingProduct && <ProductModal categories={categories} suppliers={suppliers} storekeepers={storekeepers} existingNames={products} product={editingProduct} onClose={() => setEditingProduct(null)} />}

      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Catalogue produits</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "2px 0 0" }}>{products.length} produits référencés</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#111827", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={15} /> Nouveau produit
          </button>
        )}
      </div>

      <div className="search-filter-bar" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: "100%", maxWidth: 320 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." style={{ padding: "8px 12px 8px 30px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, width: "100%" }} />
        </div>

        {/* Desktop : boutons catégories */}
        <div className="cat-buttons-desktop" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all", ...categories.map((c) => c.name)].map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              style={{ padding: "6px 13px", borderRadius: 7, border: "none", background: catFilter === c ? "#dc2626" : "#111827", color: "white", fontSize: 12, cursor: "pointer", fontWeight: 600, transition: "background 0.15s ease" }}
            >
              {c === "all" ? "Toutes" : c}
            </button>
          ))}
        </div>

        {/* Mobile : menu déroulant catégories */}
        <div className="cat-select-mobile" style={{ width: "100%" }}>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
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
            <option value="all" style={{ background: "#111827", color: "white" }}>Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id ?? c.name} value={c.name} style={{ background: "#111827", color: "white" }}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div className="table-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Produit", "Référence", "Catégorie", "Fournisseur", ...(canSeeBuyPrice ? ["Prix achat"] : []), "Prix vente", "Seuil min", "Magasiniers", "Statut", canEdit ? "Actions" : ""].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                </td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748b" }}>{p.reference}</td>
                <td style={{ padding: "10px 14px" }}>
                  {p.category && <span style={{ padding: "2px 8px", borderRadius: 20, background: "#f1f5f9", fontSize: 12 }}>{p.category.name}</span>}
                </td>
                <td style={{ padding: "10px 14px", fontSize: 12.5, color: "#64748b" }}>{p.supplier?.name ?? "—"}</td>
                {canSeeBuyPrice && <td style={{ padding: "10px 14px", fontSize: 13 }}>{p.buyPrice !== null ? formatMoney(p.buyPrice, currency) : "—"}</td>}
                <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#111827" }}>{formatMoney(p.sellPrice, currency)}</td>
                <td style={{ padding: "10px 14px", fontSize: 13 }}>{p.minQty} <span style={{ color: "#94a3b8", fontSize: 11.5 }}>{p.unit}</span></td>
                <td style={{ padding: "10px 14px" }}>
                  <ManagersCell product={p} storekeepers={storekeepers} canEdit={canEdit} />
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: p.active ? "#f0fdf4" : "#f1f5f9", color: p.active ? "#16a34a" : "#94a3b8", fontSize: 11.5, fontWeight: 600 }}>
                    {p.active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />} {p.active ? "Actif" : "Inactif"}
                  </span>
                </td>
                {canEdit && (
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setEditingProduct(p)} title="Modifier" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}><Pencil size={13} /></button>
                      <button
                        onClick={async () => {
                          try {
                            await toggleProductActive(p.id, !p.active)
                            showToast(p.active ? "Produit désactivé" : "Produit activé", "success")
                          } catch (e: any) {
                            showToast(e.message ?? "L'opération a échoué", "error")
                          }
                        }}
                        title={p.active ? "Désactiver" : "Activer"}
                        style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}
                      >
                        {p.active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                      </button>
                      {canDelete && (
                        <button
                          onClick={async () => {
                            if (!confirm(`Supprimer "${p.name}" ?`)) return
                            try {
                              await deleteProduct(p.id)
                              showToast("Produit supprimé avec succès", "success")
                            } catch (e: any) {
                              showToast(e.message ?? "Suppression impossible", "error")
                            }
                          }}
                          title="Supprimer"
                          style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #fecaca", background: "#fff5f5", color: "#dc2626", cursor: "pointer" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Catégories</h2>
          {canEdit && (
            <button
              onClick={async () => {
                const name = prompt("Nom de la nouvelle catégorie")
                if (!name) return
                try {
                  await createCategory(name)
                  showToast("Catégorie créée avec succès", "success")
                } catch (e: any) {
                  showToast(e.message ?? "La création a échoué", "error")
                }
              }}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, border: "1px solid #e2e8f0", background: "white", fontSize: 12.5, cursor: "pointer" }}
            >
              <Plus size={13} /> Ajouter
            </button>
          )}
        </div>
        <div style={{ padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: 8 }}>
          {categories.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fafbfc" }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>· {c._count.products} produits</span>
              {canEdit && (
                <button
                  onClick={async () => {
                    if (!confirm(`Supprimer la catégorie "${c.name}" ?`)) return
                    try {
                      await deleteCategory(c.id)
                      showToast("Catégorie supprimée avec succès", "success")
                    } catch (e: any) {
                      showToast(e.message ?? "Suppression impossible", "error")
                    }
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

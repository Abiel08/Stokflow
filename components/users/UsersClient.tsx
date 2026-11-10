"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, X, CheckSquare } from "lucide-react"
import { createUser, updateUserProfile, adminResetPassword, updateUserManagedProducts, toggleUserActive, updateUserRole, updateUserWarehouse, deleteUser } from "@/app/(dashboard)/utilisateurs/actions"
import { useToast } from "@/components/toast/ToastProvider"
import type { Role } from "@prisma/client"

interface UserRow {
  id: string
  name: string
  username: string
  role: Role
  active: boolean
  lastLogin: string
  warehouseId: string | null
  warehouseName: string | null
  managedProductsCount: number
  managedProductIds: string[]
}
interface WarehouseOption { id: string; name: string }
interface ProductOption { id: string; name: string; reference: string; warehouseIds: string[] }

const roleColors: Record<Role, { bg: string; color: string; label: string }> = {
  ADMIN: { bg: "#faf5ff", color: "#7c3aed", label: "Admin" },
  MANAGER: { bg: "#eff6ff", color: "#2563eb", label: "Gestionnaire" },
  STOREKEEPER: { bg: "#f0fdf4", color: "#16a34a", label: "Magasinier" },
  AUDITOR: { bg: "#fffbeb", color: "#d97706", label: "Auditeur" },
}

const permissionMatrix: [string, boolean, boolean, boolean, boolean][] = [
  ["Dashboard", true, true, true, true],
  ["Stock — Lecture", true, true, true, true],
  ["Stock — Entrée/Sortie", true, true, true, false],
  ["Stock — Inventaire", true, true, false, false],
  ["Produits — Modification", true, true, false, false],
  ["Fournisseurs", true, true, false, false],
  ["Rapports", true, true, false, true],
  ["Utilisateurs", true, false, false, false],
  ["Paramètres", true, false, false, false],
]

const inputStyle: React.CSSProperties = { padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }
const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, color: "#64748b", marginBottom: 5 }

function EditUserModal({ user, products, onClose }: { user: UserRow; products: ProductOption[]; onClose: () => void }) {
  const [error, setError] = useState("")
  const { showToast } = useToast()
  const eligibleProducts = user.warehouseId ? products.filter((p) => p.warehouseIds.includes(user.warehouseId!)) : []

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div className="modal-panel" style={{ background: "white", borderRadius: 16, width: 460, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Modifier {user.name}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <form
          action={async (fd) => {
            setError("")
            try {
              await updateUserProfile(user.id, fd)
              const newPassword = String(fd.get("newPassword") || "")
              if (newPassword) await adminResetPassword(user.id, newPassword)
              if (user.role === "STOREKEEPER") {
                const productIds = fd.getAll("productIds").map(String)
                await updateUserManagedProducts(user.id, productIds)
              }
              showToast("Utilisateur modifié avec succès", "success")
              onClose()
            } catch (e: any) {
              setError(e.message ?? "Une erreur est survenue.")
            }
          }}
          style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}
        >
          {error && <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#dc2626", borderRadius: 8, fontSize: 12.5 }}>{error}</div>}
          <div>
            <label style={labelStyle}>Nom complet</label>
            <input name="name" required defaultValue={user.name} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Identifiant</label>
            <input name="username" required defaultValue={user.username} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Réinitialiser le mot de passe <span style={{ color: "#94a3b8" }}>(laisser vide pour ne pas changer)</span></label>
            <input name="newPassword" type="password" placeholder="Nouveau mot de passe" minLength={6} style={inputStyle} />
          </div>

          {user.role === "STOREKEEPER" && (
            <div>
              <label style={labelStyle}>
                Produits gérés <span style={{ color: "#94a3b8" }}>(uniquement les produits présents dans son entrepôt : {user.warehouseName ?? "aucun"})</span>
              </label>
              {!user.warehouseId ? (
                <p style={{ fontSize: 12.5, color: "#94a3b8", margin: 0 }}>Affecte d'abord un entrepôt à ce magasinier pour pouvoir lui assigner des produits.</p>
              ) : eligibleProducts.length === 0 ? (
                <p style={{ fontSize: 12.5, color: "#94a3b8", margin: 0 }}>Aucun produit en stock dans cet entrepôt pour l'instant.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
                  {eligibleProducts.map((p) => (
                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "3px 0" }}>
                      <input type="checkbox" name="productIds" value={p.id} defaultChecked={user.managedProductIds.includes(p.id)} />
                      {p.name} <span style={{ color: "#94a3b8" }}>({p.reference})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <button type="submit" style={{ padding: 10, borderRadius: 8, border: "none", background: "#111827", color: "white", fontWeight: 600, cursor: "pointer", marginTop: 6 }}>
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  )
}

export default function UsersClient({ users, warehouses, products }: { users: UserRow[]; warehouses: WarehouseOption[]; products: ProductOption[] }) {
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [newRole, setNewRole] = useState<Role>("STOREKEEPER")
  const { showToast } = useToast()

  return (
    <div className="page-enter" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Utilisateurs</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "2px 0 0" }}>{users.filter((u) => u.active).length} actifs · {users.length} total</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#111827", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={15} /> Nouvel utilisateur
        </button>
      </div>

      {editingUser && <EditUserModal user={editingUser} products={products} onClose={() => setEditingUser(null)} />}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div className="modal-panel" style={{ background: "white", borderRadius: 16, width: 420 }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Nouvel utilisateur</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <form
              action={async (fd) => {
                try {
                  await createUser(fd)
                  showToast("Utilisateur créé avec succès", "success")
                  setShowModal(false)
                } catch (e: any) {
                  showToast(e.message ?? "La création a échoué", "error")
                }
              }}
              style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}
            >
              <input name="name" required placeholder="Nom complet" style={inputStyle} />
              <input name="username" type="text" required placeholder="Identifiant (ex: j.dupont)" style={inputStyle} />
              <input name="password" type="password" required placeholder="Mot de passe temporaire" style={inputStyle} />
              <select name="role" required style={inputStyle} defaultValue="STOREKEEPER" onChange={(e) => setNewRole(e.target.value as Role)}>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Gestionnaire</option>
                <option value="STOREKEEPER">Magasinier</option>
                <option value="AUDITOR">Auditeur</option>
              </select>
              {newRole === "STOREKEEPER" && (
                <div>
                  <label style={labelStyle}>
                    Entrepôt de rattachement <span style={{ color: "#94a3b8" }}>(un magasinier n'est rattaché qu'à un seul entrepôt)</span>
                  </label>
                  <select name="warehouseId" required style={inputStyle} defaultValue="">
                    <option value="" disabled>— Choisir un entrepôt —</option>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              )}
              <button type="submit" style={{ padding: 10, borderRadius: 8, border: "none", background: "#111827", color: "white", fontWeight: 600, cursor: "pointer" }}>Créer</button>
            </form>
          </div>
        </div>
      )}

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div className="table-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Utilisateur", "Identifiant", "Rôle", "Entrepôt", "Produits gérés", "Statut", "Dernière connexion", "Actions"].map((h) => <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => {
              const rc = roleColors[u.role]
              return (
                <tr key={u.id} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                  <td style={{ padding: "12px 16px", fontSize: 13.5, fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12.5, color: "#64748b" }}>{u.username}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <select
                      defaultValue={u.role}
                      onChange={async (e) => {
                        try {
                          await updateUserRole(u.id, e.target.value as Role)
                          showToast("Rôle mis à jour avec succès", "success")
                        } catch (err: any) {
                          showToast(err.message ?? "La mise à jour a échoué", "error")
                        }
                      }}
                      style={{ padding: "3px 8px", borderRadius: 20, background: rc.bg, color: rc.color, fontSize: 12, fontWeight: 600, border: "none" }}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Gestionnaire</option>
                      <option value="STOREKEEPER">Magasinier</option>
                      <option value="AUDITOR">Auditeur</option>
                    </select>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {u.role === "STOREKEEPER" ? (
                      <select
                        defaultValue={u.warehouseId ?? ""}
                        onChange={async (e) => {
                          try {
                            await updateUserWarehouse(u.id, e.target.value || null)
                            showToast("Entrepôt mis à jour avec succès", "success")
                          } catch (err: any) {
                            showToast(err.message ?? "La mise à jour a échoué", "error")
                          }
                        }}
                        style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12.5, background: "white" }}
                      >
                        <option value="">—</option>
                        {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: 12.5, color: "#cbd5e1" }}>N/A</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12.5, color: "#64748b" }}>
                    {u.role === "STOREKEEPER" ? `${u.managedProductsCount} produits` : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={async () => {
                        try {
                          await toggleUserActive(u.id, !u.active)
                          showToast(u.active ? "Utilisateur désactivé" : "Utilisateur activé", "success")
                        } catch (e: any) {
                          showToast(e.message ?? "L'opération a échoué", "error")
                        }
                      }}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: u.active ? "#f0fdf4" : "#f1f5f9", color: u.active ? "#16a34a" : "#94a3b8", fontSize: 11.5, fontWeight: 600, border: "none", cursor: "pointer" }}
                    >
                      {u.active ? "Actif" : "Inactif"}
                    </button>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#94a3b8" }}>{u.lastLogin}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setEditingUser(u)} title="Modifier" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}><Pencil size={13} /></button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Supprimer "${u.name}" ?`)) return
                          try {
                            await deleteUser(u.id)
                            showToast("Utilisateur supprimé avec succès", "success")
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
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Matrice des permissions</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b" }}>Module</th>
                {["Admin", "Gestionnaire", "Magasinier", "Auditeur"].map((r) => <th key={r} style={{ padding: "10px 16px", textAlign: "center", fontSize: 12, fontWeight: 600, color: "#64748b" }}>{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map(([label, ...perms]) => (
                <tr key={String(label)} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13 }}>{String(label)}</td>
                  {perms.map((p, j) => (
                    <td key={j} style={{ padding: "10px 16px", textAlign: "center" }}>
                      <CheckSquare size={16} color={p ? "#16a34a" : "#e2e8f0"} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ padding: "10px 20px", fontSize: 11.5, color: "#94a3b8", margin: 0 }}>
          Cette matrice reflète <code>lib/permissions.ts</code> — modifie ce fichier pour changer les droits.
        </p>
      </div>
    </div>
  )
}

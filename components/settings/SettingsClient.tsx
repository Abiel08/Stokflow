"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { updateCompanySettings, updateTaxSettings, updateNotificationSettings, createUnit, deleteUnit } from "@/app/(dashboard)/parametres/actions"
import { useToast } from "@/components/toast/ToastProvider"

type Tab = "entreprise" | "unites" | "taxes" | "notifications"

interface Company {
  name: string
  phone: string | null
  email: string | null
  address: string | null
  currency: string
  dateFormat: string
  taxRate: number
  notifyLowStockEmail: boolean
  notifyLowStockInApp: boolean
}
interface Unit { id: string; name: string }

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13.5, outline: "none" }
const btnStyle: React.CSSProperties = { padding: "10px 24px", borderRadius: 8, border: "none", background: "#111827", color: "white", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }

export default function SettingsClient({ company, units }: { company: Company; units: Unit[] }) {
  const [tab, setTab] = useState<Tab>("entreprise")
  const { showToast } = useToast()

  const sections: { id: Tab; label: string }[] = [
    { id: "entreprise", label: "Informations entreprise" },
    { id: "unites", label: "Unités de mesure" },
    { id: "taxes", label: "Taxes & devises" },
    { id: "notifications", label: "Notifications" },
  ]

  return (
    <div className="page-enter settings-layout" style={{ padding: 24, display: "flex", gap: 20 }}>
      {/* Desktop : menu latéral */}
      <div className="settings-nav-desktop" style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", padding: "8px 12px 4px" }}>Paramètres</div>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setTab(s.id)}
            style={{ padding: "9px 12px", borderRadius: 8, background: tab === s.id ? "#dc2626" : "#111827", color: "white", fontSize: 13, fontWeight: 600, border: "none", textAlign: "left", cursor: "pointer", transition: "background 0.15s ease" }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Mobile : menu déroulant */}
      <div className="settings-select-mobile" style={{ width: "100%" }}>
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
          {sections.map((s) => (
            <option key={s.id} value={s.id} style={{ background: "#111827", color: "white" }}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-content" style={{ flex: 1, background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 28, maxWidth: 640, minWidth: 0 }}>
        {tab === "entreprise" && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 24px" }}>Informations entreprise</h2>
            <form
              action={async (fd) => {
                try {
                  await updateCompanySettings(fd)
                  showToast("Informations enregistrées avec succès", "success")
                } catch (e: any) {
                  showToast(e.message ?? "L'enregistrement a échoué", "error")
                }
              }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Nom de l'entreprise</label>
                  <input name="name" defaultValue={company.name} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Téléphone</label>
                  <input name="phone" defaultValue={company.phone ?? ""} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input name="email" type="email" defaultValue={company.email ?? ""} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Format de date</label>
                  <select name="dateFormat" defaultValue={company.dateFormat} style={inputStyle}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  </select>
                </div>
                <input type="hidden" name="currency" value={company.currency} />
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Adresse</label>
                  <input name="address" defaultValue={company.address ?? ""} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <button type="submit" style={btnStyle}>Enregistrer les modifications</button>
              </div>
            </form>
          </>
        )}

        {tab === "unites" && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>Unités de mesure</h2>
            <p style={{ fontSize: 12.5, color: "#64748b", margin: "0 0 20px" }}>Ces unités apparaissent dans le formulaire de création d'un produit.</p>

            <form
              action={async (fd) => {
                try {
                  await createUnit(fd)
                  showToast("Unité ajoutée avec succès", "success")
                } catch (e: any) {
                  showToast(e.message ?? "L'ajout a échoué", "error")
                }
              }}
              style={{ display: "flex", gap: 8, marginBottom: 20 }}
            >
              <input name="name" placeholder="ex: kg, litre, carton..." required style={{ ...inputStyle, flex: 1 }} />
              <button type="submit" style={{ ...btnStyle, display: "flex", alignItems: "center", gap: 6, padding: "9px 16px" }}>
                <Plus size={15} /> Ajouter
              </button>
            </form>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {units.length === 0 && <p style={{ fontSize: 12.5, color: "#94a3b8" }}>Aucune unité définie pour l'instant.</p>}
              {units.map((u) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fafbfc" }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</span>
                  <button
                    onClick={async () => {
                      try {
                        await deleteUnit(u.id)
                        showToast("Unité supprimée avec succès", "success")
                      } catch (e: any) {
                        showToast(e.message ?? "Suppression impossible", "error")
                      }
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "taxes" && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 24px" }}>Taxes & devises</h2>
            <form
              action={async (fd) => {
                try {
                  await updateTaxSettings(fd)
                  showToast("Taxes & devises enregistrées avec succès", "success")
                } catch (e: any) {
                  showToast(e.message ?? "L'enregistrement a échoué", "error")
                }
              }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Devise principale</label>
                  <select name="currency" defaultValue={company.currency} style={inputStyle}>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="XOF">XOF (FCFA)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Taux de TVA (%)</label>
                  <input name="taxRate" type="number" step="0.01" min="0" defaultValue={company.taxRate} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <button type="submit" style={btnStyle}>Enregistrer</button>
              </div>
            </form>
          </>
        )}

        {tab === "notifications" && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>Notifications</h2>
            <p style={{ fontSize: 12.5, color: "#64748b", margin: "0 0 20px" }}>Alertes envoyées lorsqu'un produit passe sous son seuil minimum.</p>
            <form
              action={async (fd) => {
                try {
                  await updateNotificationSettings(fd)
                  showToast("Préférences de notification enregistrées avec succès", "success")
                } catch (e: any) {
                  showToast(e.message ?? "L'enregistrement a échoué", "error")
                }
              }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
                <input type="checkbox" name="notifyLowStockInApp" defaultChecked={company.notifyLowStockInApp} />
                Afficher les alertes de stock bas dans le Dashboard
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
                <input type="checkbox" name="notifyLowStockEmail" defaultChecked={company.notifyLowStockEmail} />
                Envoyer un email lors d'une alerte de stock bas
              </label>
              <div style={{ marginTop: 8 }}>
                <button type="submit" style={btnStyle}>Enregistrer</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

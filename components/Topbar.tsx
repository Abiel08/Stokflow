"use client"

import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { Bell, AlertTriangle, ClipboardCheck, Menu } from "lucide-react"

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/stock": "Gestion du stock",
  "/produits": "Catalogue produits",
  "/fournisseurs": "Fournisseurs",
  "/entrepots": "Entrepôts",
  "/rapports": "Rapports",
  "/utilisateurs": "Utilisateurs",
  "/logs": "Logs d'activité",
  "/parametres": "Paramètres",
}

interface StockAlert { id: string; name: string; qty: number; min: number }

export default function Topbar({
  companyName, stockAlerts, pendingInventoryCount, onMenuClick,
}: {
  companyName: string
  stockAlerts: StockAlert[]
  pendingInventoryCount: number
  onMenuClick?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const match = Object.keys(titles).find((k) => pathname.startsWith(k))
  const title = (match && titles[match]) || ""

  const totalCount = stockAlerts.length + (pendingInventoryCount > 0 ? 1 : 0)

  return (
    <header style={{ height: 56, background: "white", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0, position: "relative", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <button className="hamburger-btn" onClick={onMenuClick} style={{ background: "none", border: "none", cursor: "pointer", color: "#111827", flexShrink: 0 }}>
          <Menu size={20} />
        </button>
        <div style={{ fontSize: 13, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {companyName} <span style={{ margin: "0 6px" }}>/</span> <span style={{ color: "#0f172a", fontWeight: 600 }}>{title}</span>
        </div>
      </div>

      <button onClick={() => setOpen((o) => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", position: "relative" }}>
        <Bell size={18} />
        {totalCount > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, background: "#dc2626", color: "white", fontSize: 9.5, fontWeight: 700, borderRadius: "50%", width: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {totalCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div className="notif-panel" style={{ position: "absolute", top: 48, right: 20, width: 320, background: "white", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontSize: 13, fontWeight: 700 }}>Notifications</div>

            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {totalCount === 0 && (
                <p style={{ padding: "20px 16px", fontSize: 12.5, color: "#94a3b8", textAlign: "center", margin: 0 }}>Rien à signaler 🎉</p>
              )}

              {pendingInventoryCount > 0 && (
                <button
                  onClick={() => { setOpen(false); router.push("/stock") }}
                  style={{ width: "100%", display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 16px", background: "none", border: "none", borderBottom: "1px solid #f1f5f9", cursor: "pointer", textAlign: "left" }}
                >
                  <ClipboardCheck size={16} color="#2563eb" style={{ marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{pendingInventoryCount} inventaire{pendingInventoryCount > 1 ? "s" : ""} en attente</div>
                    <div style={{ fontSize: 11.5, color: "#94a3b8" }}>À valider dans Stock → Inventaire</div>
                  </div>
                </button>
              )}

              {stockAlerts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setOpen(false); router.push("/stock") }}
                  style={{ width: "100%", display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 16px", background: "none", border: "none", borderBottom: "1px solid #f1f5f9", cursor: "pointer", textAlign: "left" }}
                >
                  <AlertTriangle size={16} color="#dc2626" style={{ marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{a.qty} en stock · seuil min. {a.min}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </header>
  )
}

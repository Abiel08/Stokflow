"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard, Package, Boxes, Truck, Warehouse, BarChart3,
  Users, ScrollText, Settings, ChevronLeft, ChevronRight, LogOut, ArrowLeftRight, KeyRound, X,
} from "lucide-react"
import { signOutAction } from "@/app/(dashboard)/actions"
import { can, type ModulePermission } from "@/lib/permissions"
import type { Role } from "@prisma/client"

const navItems: { href: string; label: string; icon: any; permission: ModulePermission }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
  { href: "/stock", label: "Stock", icon: Boxes, permission: "stock.read" },
  { href: "/produits", label: "Produits", icon: Package, permission: "stock.read" },
  { href: "/fournisseurs", label: "Fournisseurs", icon: Truck, permission: "suppliers" },
  { href: "/entrepots", label: "Entrepôts", icon: Warehouse, permission: "warehouses.read" },
  { href: "/rapports", label: "Rapports", icon: BarChart3, permission: "reports" },
  { href: "/utilisateurs", label: "Utilisateurs", icon: Users, permission: "users" },
  { href: "/logs", label: "Logs", icon: ScrollText, permission: "logs" },
  { href: "/parametres", label: "Paramètres", icon: Settings, permission: "settings" },
]

export default function Sidebar({
  role, userName, companyName, mobileOpen = false, onClose,
}: {
  role: Role
  userName: string
  companyName: string
  mobileOpen?: boolean
  onClose?: () => void
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const initials = userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()

  const visibleItems = navItems.filter((item) => can(role, item.permission))

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar${mobileOpen ? " mobile-open" : ""}`} style={{ width: collapsed ? 64 : 232, minWidth: collapsed ? 64 : 232, background: "#7f1d1d", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, transition: "width 0.2s ease, min-width 0.2s ease", zIndex: 200, flexShrink: 0 }}>
      <div style={{ height: 56, display: "flex", alignItems: "center", padding: collapsed ? "0 16px" : "0 20px", borderBottom: "1px solid rgba(255,255,255,0.12)", gap: 10, overflow: "hidden" }}>
        <div style={{ width: 32, height: 32, background: "#111827", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ArrowLeftRight size={16} color="white" />
        </div>
        {!collapsed && <span style={{ color: "white", fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{companyName}</span>}
        <button className="sidebar-close-btn" onClick={onClose} style={{ display: "none", background: "none", border: "none", color: "white", cursor: "pointer", flexShrink: 0 }}>
          <X size={20} />
        </button>
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={onClose}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", borderRadius: 7, cursor: "pointer", background: active ? "#111827" : "transparent", color: active ? "white" : "rgba(255,255,255,0.75)", fontSize: 13.5, fontWeight: active ? 600 : 400, marginBottom: 2, textDecoration: "none", whiteSpace: "nowrap", overflow: "hidden", justifyContent: collapsed ? "center" : "flex-start" }}
            >
              <item.icon size={17} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", padding: collapsed ? "12px 8px" : "12px 12px" }}>
        {!collapsed && (
          <Link href="/compte" onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px", borderRadius: 8, marginBottom: 4, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ color: "white", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{userName}</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11.5 }}>{roleLabel(role)}</div>
            </div>
          </Link>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: collapsed ? "center" : "stretch" }}>
          {collapsed ? (
            <Link href="/compte" onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              {initials}
            </Link>
          ) : (
            <Link href="/compte" onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.75)", fontSize: 12, padding: "4px 8px", borderRadius: 6, textDecoration: "none" }}>
              <KeyRound size={14} /> Mon compte
            </Link>
          )}
          <form action={signOutAction}>
            <button type="submit" style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.75)", background: "none", border: "none", cursor: "pointer", fontSize: 12, padding: "4px 8px", borderRadius: 6 }}>
              <LogOut size={14} /> {!collapsed && "Déconnexion"}
            </button>
          </form>
        </div>
      </div>

      <button className="sidebar-collapse-toggle" onClick={() => setCollapsed((c) => !c)} style={{ position: "absolute", top: 64, right: -12, width: 24, height: 24, background: "#111827", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50%", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", zIndex: 50 }}>
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
      </aside>
    </>
  )
}

function roleLabel(role: Role) {
  const labels: Record<Role, string> = {
    ADMIN: "Admin",
    MANAGER: "Gestionnaire",
    STOREKEEPER: "Magasinier",
    AUDITOR: "Auditeur",
  }
  return labels[role]
}

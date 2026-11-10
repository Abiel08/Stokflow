"use client"

import { useState } from "react"
import Sidebar from "@/components/Sidebar"
import Topbar from "@/components/Topbar"
import BottomNav from "@/components/BottomNav"
import type { Role } from "@prisma/client"

interface StockAlert { id: string; name: string; qty: number; min: number }

export default function AppShell({
  role, userName, companyName, stockAlerts, pendingInventoryCount, children,
}: {
  role: Role
  userName: string
  companyName: string
  stockAlerts: StockAlert[]
  pendingInventoryCount: number
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="app-shell" style={{ display: "flex", height: "100vh", background: "#f1f5f9", overflow: "hidden" }}>
      <Sidebar role={role} userName={userName} companyName={companyName} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="app-content" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <Topbar companyName={companyName} stockAlerts={stockAlerts} pendingInventoryCount={pendingInventoryCount} onMenuClick={() => setMobileOpen(true)} />
        <main className="app-main" style={{ flex: 1, overflowY: "auto" }}>{children}</main>
        <BottomNav role={role} onMoreClick={() => setMobileOpen(true)} />
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Boxes, Package, BarChart3, Menu } from "lucide-react"
import { can, type ModulePermission } from "@/lib/permissions"
import type { Role } from "@prisma/client"

const primaryItems: { href: string; label: string; icon: any; permission: ModulePermission }[] = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard, permission: "dashboard" },
  { href: "/stock", label: "Stock", icon: Boxes, permission: "stock.read" },
  { href: "/produits", label: "Produits", icon: Package, permission: "stock.read" },
  { href: "/rapports", label: "Rapports", icon: BarChart3, permission: "reports" },
]

export default function BottomNav({ role, onMoreClick }: { role: Role; onMoreClick: () => void }) {
  const pathname = usePathname()
  const items = primaryItems.filter((item) => can(role, item.permission)).slice(0, 4)

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} className={`bottom-nav-item${active ? " active" : ""}`}>
            <item.icon size={20} strokeWidth={active ? 2.4 : 2} />
            <span>{item.label}</span>
          </Link>
        )
      })}
      <button onClick={onMoreClick} className="bottom-nav-item bottom-nav-more">
        <Menu size={20} />
        <span>Plus</span>
      </button>
    </nav>
  )
}

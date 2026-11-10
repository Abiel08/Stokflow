"use client"

import { TrendingUp, Package, AlertTriangle, ArrowUpDown, AlertOctagon } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface Kpis {
  stockValue: number
  productsCount: number
  alertsCount: number
  movementsToday: number
  inToday: number
  outToday: number
  defectiveCount: number
}

interface Alert { name: string; ref: string; qty: number; min: number }
interface DefectiveAlert { name: string; ref: string; qty: number }
interface Activity { time: string; user: string; action: string; detail: string; module: string }
interface SeriesPoint { date: string; entrées: number; sorties: number }

import { formatMoney } from "@/lib/currency"

export default function DashboardClient({
  kpis, alerts, defectiveAlerts, recentActivity, movementSeries, currency,
}: {
  kpis: Kpis
  alerts: Alert[]
  defectiveAlerts: DefectiveAlert[]
  recentActivity: Activity[]
  movementSeries: SeriesPoint[]
  currency: string
}) {
  const kpiCards = [
    { label: "Valeur totale du stock", value: formatMoney(kpis.stockValue, currency), icon: TrendingUp, color: "#2563eb", bg: "#eff6ff" },
    { label: "Produits référencés", value: kpis.productsCount.toString(), icon: Package, color: "#7c3aed", bg: "#f5f3ff" },
    { label: "Produits en alerte", value: kpis.alertsCount.toString(), icon: AlertTriangle, color: "#dc2626", bg: "#fef2f2" },
    { label: "Mouvements du jour", value: kpis.movementsToday.toString(), sub: `${kpis.inToday} entrées · ${kpis.outToday} sorties`, icon: ArrowUpDown, color: "#d97706", bg: "#fffbeb" },
    { label: "Stock défectueux", value: kpis.defectiveCount.toString(), icon: AlertOctagon, color: "#ea580c", bg: "#fff7ed" },
  ]

  return (
    <div className="page-enter" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: "#64748b", margin: "2px 0 0" }}>Vue d'ensemble en temps réel</p>
      </div>

      <div className="responsive-grid-5" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
        {kpiCards.map((kpi) => (
          <div key={kpi.label} style={{ background: "white", borderRadius: 12, padding: "18px 20px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0, fontWeight: 500 }}>{kpi.label}</p>
                <p style={{ fontSize: 24, fontWeight: 700, margin: "4px 0 0" }}>{kpi.value}</p>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: kpi.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <kpi.icon size={18} color={kpi.color} />
              </div>
            </div>
            {kpi.sub && <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{kpi.sub}</p>}
          </div>
        ))}
      </div>

      <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr minmax(0, 340px)", gap: 16 }}>
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 20px 12px" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 20px" }}>Mouvements de stock (30 derniers jours)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={movementSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" />
              <YAxis fontSize={11} stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="entrées" stroke="#16a34a" fill="#dcfce7" />
              <Area type="monotone" dataKey="sorties" stroke="#dc2626" fill="#fee2e2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Alertes</h2>
            <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
              {alerts.length + defectiveAlerts.length} alertes
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, overflowY: "auto" }}>
            {alerts.length === 0 && defectiveAlerts.length === 0 && <p style={{ fontSize: 12.5, color: "#94a3b8" }}>Aucune alerte 🎉</p>}

            {alerts.length > 0 && (
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#dc2626", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
                  Stockage insuffisant
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {alerts.map((a) => (
                    <div key={a.ref} style={{ padding: "11px 13px", borderRadius: 9, background: "#fff5f5", border: "1px solid #fecaca", display: "flex", alignItems: "center", gap: 10 }}>
                      <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{a.qty} en stock · min. {a.min}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {defectiveAlerts.length > 0 && (
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#ea580c", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
                  Produit défectueux
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {defectiveAlerts.map((a) => (
                    <div key={a.ref} style={{ padding: "11px 13px", borderRadius: 9, background: "#fff7ed", border: "1px solid #fed7aa", display: "flex", alignItems: "center", gap: 10 }}>
                      <AlertOctagon size={15} color="#ea580c" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{a.qty} en attente de décision</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px" }}>Activité récente</h2>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {recentActivity.length === 0 && <p style={{ fontSize: 12.5, color: "#94a3b8" }}>Aucune activité récente</p>}
          {recentActivity.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "11px 0", borderBottom: i < recentActivity.length - 1 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.action}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{a.detail}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{a.time} · {a.user}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

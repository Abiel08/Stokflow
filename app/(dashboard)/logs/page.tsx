import { prisma } from "@/lib/prisma"
import { Clock } from "lucide-react"

export default async function LogsPage() {
  const logs = await prisma.activityLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return (
    <div className="page-enter" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Logs d'activité</h1>
        <p style={{ fontSize: 13, color: "#64748b", margin: "2px 0 0" }}>Traçabilité complète en lecture seule — {logs.length} entrées</p>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div className="table-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Date / Heure", "Utilisateur", "Action", "Module", "Détail"].map((h) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={l.id} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                <td style={{ padding: "11px 16px", fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                  <Clock size={12} style={{ display: "inline", marginRight: 5 }} />
                  {l.createdAt.toLocaleString("fr-FR")}
                </td>
                <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 500 }}>{l.user.name}</td>
                <td style={{ padding: "11px 16px", fontSize: 13 }}>{l.action}</td>
                <td style={{ padding: "11px 16px" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 20, background: "#f1f5f9", color: "#475569", fontSize: 12 }}>{l.module}</span>
                </td>
                <td style={{ padding: "11px 16px", fontSize: 12.5, color: "#64748b" }}>{l.detail}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucune activité enregistrée</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

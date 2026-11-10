import { authenticate } from "./actions"

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="login-split" style={{ display: "flex", height: "100vh" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "white", padding: "24px" }}>
        <form action={authenticate} style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, background: "#111827", borderRadius: 10, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700 }}>
              SF
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>StockFlow</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>Connectez-vous à votre espace</p>
          </div>

          {searchParams?.error && (
            <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#dc2626", borderRadius: 8, fontSize: 13 }}>
              Identifiant ou mot de passe incorrect.
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>Identifiant</label>
            <input name="username" type="text" required autoComplete="username" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13.5 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>Mot de passe</label>
            <input name="password" type="password" required autoComplete="current-password" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13.5 }} />
          </div>
          <button type="submit" style={{ padding: 10, borderRadius: 8, border: "none", background: "#111827", color: "white", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
            Se connecter
          </button>
        </form>
      </div>
      <div className="login-visual" style={{ flex: 1, background: "linear-gradient(135deg,#1e293b,#0f172a)" }} />
    </div>
  )
}

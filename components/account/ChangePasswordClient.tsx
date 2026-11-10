"use client"

import { useState } from "react"
import { KeyRound } from "lucide-react"
import { changeOwnPassword } from "@/app/(dashboard)/compte/actions"

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13.5, outline: "none" }

export default function ChangePasswordClient({ userName, username }: { userName: string; username: string }) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  return (
    <div className="page-enter" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Mon compte</h1>
        <p style={{ fontSize: 13, color: "#64748b", margin: "2px 0 0" }}>{userName} · {username}</p>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 28, maxWidth: 440 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <KeyRound size={17} color="#111827" />
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>Changer mon mot de passe</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Tu ne peux modifier que ton propre mot de passe ici.</div>
          </div>
        </div>

        {status === "success" && (
          <div style={{ padding: "8px 12px", background: "#f0fdf4", color: "#16a34a", borderRadius: 8, fontSize: 12.5, marginBottom: 16 }}>
            Mot de passe mis à jour avec succès.
          </div>
        )}
        {status === "error" && (
          <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#dc2626", borderRadius: 8, fontSize: 12.5, marginBottom: 16 }}>
            {message}
          </div>
        )}

        <form
          action={async (formData) => {
            setStatus("idle")
            try {
              await changeOwnPassword(formData)
              setStatus("success")
              ;(document.getElementById("change-password-form") as HTMLFormElement)?.reset()
            } catch (e: any) {
              setStatus("error")
              setMessage(e.message ?? "Une erreur est survenue.")
            }
          }}
          id="change-password-form"
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label style={labelStyle}>Mot de passe actuel</label>
            <input name="currentPassword" type="password" required autoComplete="current-password" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Nouveau mot de passe</label>
            <input name="newPassword" type="password" required minLength={6} autoComplete="new-password" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Confirmer le nouveau mot de passe</label>
            <input name="confirmPassword" type="password" required minLength={6} autoComplete="new-password" style={inputStyle} />
          </div>
          <button type="submit" style={{ padding: 10, borderRadius: 8, border: "none", background: "#111827", color: "white", fontSize: 13.5, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>
            Mettre à jour le mot de passe
          </button>
        </form>
      </div>
    </div>
  )
}

"use client"

import { createContext, useCallback, useContext, useState } from "react"
import { CheckCircle2, XCircle, X } from "lucide-react"

type ToastType = "success" | "error"
interface ToastItem { id: number; message: string; type: ToastType }

const ToastContext = createContext<{ showToast: (message: string, type?: ToastType) => void } | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast doit être utilisé à l'intérieur de ToastProvider")
  return ctx
}

// Petit helper pratique : exécute une server action, affiche un toast succès/erreur automatiquement.
// Usage : await runWithToast(showToast, () => createProduct(formData), "Produit créé")
export async function runWithToast<T>(
  showToast: (message: string, type?: ToastType) => void,
  fn: () => Promise<T>,
  successMessage: string
): Promise<T | undefined> {
  try {
    const result = await fn()
    showToast(successMessage, "success")
    return result
  } catch (e: any) {
    showToast(e?.message ?? "Une erreur est survenue.", "error")
    return undefined
  }
}

let idCounter = 0

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++idCounter
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: "fixed", bottom: 20, right: 20, display: "flex", flexDirection: "column", gap: 8, zIndex: 1000 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10,
              background: t.type === "success" ? "#111827" : "#dc2626",
              color: "white", fontSize: 13, fontWeight: 500, minWidth: 260, maxWidth: 360,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)", animation: "toast-in 0.2s ease",
            }}
          >
            {t.type === "success" ? <CheckCircle2 size={17} style={{ flexShrink: 0 }} /> : <XCircle size={17} style={{ flexShrink: 0 }} />}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button onClick={() => dismiss(t.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

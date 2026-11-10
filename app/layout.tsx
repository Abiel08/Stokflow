import "./globals.css"

export const metadata = {
  title: "StockFlow — Gestion de stock",
  description: "Logiciel de gestion de stock",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}

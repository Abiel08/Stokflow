import { convertAmount } from "./exchangeRates"

const CURRENCY_SYMBOLS: Record<string, string> = { EUR: "€", USD: "$", XOF: "FCFA" }

export function currencySymbol(currency: string) {
  return CURRENCY_SYMBOLS[currency] ?? currency
}

export { convertAmount }

// Formate un nombre avec des séparateurs de milliers en espace NORMAL (pas insécable) :
// le caractère insécable produit par toLocaleString("fr-FR") s'affiche mal (voire disparaît)
// dans les PDF générés par jsPDF, ce qui donnait l'impression que "80 000" devenait "80000".
export function formatNumber(value: number, decimals = 0) {
  return value
    .toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    .replace(/[\u00A0\u202F]/g, " ")
}

export function formatMoney(value: number, currency: string) {
  const symbol = currencySymbol(currency)
  const formatted = formatNumber(value)
  // XOF s'affiche généralement après le montant (ex: 1 500 FCFA), les autres avant (ex: € 1 500)
  return currency === "XOF" ? `${formatted} ${symbol}` : `${symbol} ${formatted}`
}

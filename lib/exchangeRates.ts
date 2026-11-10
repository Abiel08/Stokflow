// Taux de change indicatifs, exprimés en "unités de devise pour 1 EUR"
// ⚠️ Ce sont des taux fixes pour la démo. Pour des taux en temps réel,
// il faudrait brancher une API de change (ex: exchangerate.host) ici.
export const RATES_PER_EUR: Record<string, number> = {
  EUR: 1,
  USD: 1.08,
  XOF: 655.957, // taux fixe (peg CFA)
}

export function convertAmount(value: number, from: string, to: string): number {
  if (from === to) return value
  const fromRate = RATES_PER_EUR[from] ?? 1
  const toRate = RATES_PER_EUR[to] ?? 1
  // valeur -> EUR -> devise cible
  const inEur = value / fromRate
  return inEur * toRate
}

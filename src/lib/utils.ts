import { Currency } from './types'

export function formatCurrency(amount: number, currency: Currency): string {
  const symbol = currency === 'USD' ? 'US$' : '$'
  return `${symbol} ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatPeriod(period: string): string {
  const [year, month] = period.split('-')
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  const monthIndex = parseInt(month, 10) - 1
  if (monthIndex < 0 || monthIndex > 11) return period
  return `${months[monthIndex]} ${year}`
}

export function getCurrentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Tenant, Currency, Payment } from '../../lib/types'
import { formatCurrency, formatPeriod, getCurrentPeriod, formatDate } from '../../lib/utils'
import { Wallet, Check, DollarSign } from 'lucide-react'

export default function StaffPayments() {
  const { user } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [period, setPeriod] = useState(getCurrentPeriod())
  const [notes, setNotes] = useState('')
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadTenants()
    loadRecentPayments()
  }, [])

  async function loadTenants() {
    const { data } = await supabase.from('tenants').select('*').order('full_name')
    setTenants((data as Tenant[]) || [])
    setLoading(false)
  }

  async function loadRecentPayments() {
    const { data } = await supabase
      .from('payments')
      .select(`
        *,
        tenants!inner(full_name, property_address)
      `)
      .order('registered_at', { ascending: false })
      .limit(10)
    setRecentPayments((data as unknown as Payment[]) || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTenant || !amount || !user) return

    setSubmitting(true)
    setMessage(null)

    const { data: rentMonth } = await supabase
      .from('rent_months')
      .select('id')
      .eq('tenant_id', selectedTenant)
      .eq('period', period)
      .maybeSingle()

    const { error } = await supabase.from('payments').insert({
      tenant_id: selectedTenant,
      rent_month_id: rentMonth?.id || null,
      amount: parseFloat(amount),
      currency,
      method: 'cash',
      period,
      registered_by: user.id,
      notes: notes || null,
    })

    if (error) {
      setMessage({ type: 'error', text: 'Error al registrar el pago: ' + error.message })
    } else {
      setMessage({ type: 'success', text: 'Pago registrado correctamente' })
      setAmount('')
      setNotes('')
      loadRecentPayments()
    }
    setSubmitting(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div></div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading text-brand-black mb-1">Registrar Pago</h1>
        <p className="text-gray-500 text-sm">Registrar un pago en efectivo de un inquilino</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment form */}
        <div className="card p-6">
          <h2 className="text-lg font-heading text-brand-black mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-brand-red" /> Nuevo Pago en Efectivo
          </h2>

          {message && (
            <div className={`mb-4 p-3 rounded-md text-sm ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inquilino</label>
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                required
                className="input-field"
              >
                <option value="">Seleccionar inquilino...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name} - {t.property_address}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="input-field"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      currency === 'USD' ? 'bg-brand-red text-white' : 'bg-white border border-gray-300 text-gray-600'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" /> USD
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('ARS')}
                    className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      currency === 'ARS' ? 'bg-brand-red text-white' : 'bg-white border border-gray-300 text-gray-600'
                    }`}
                  >
                    $ ARS
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="input-field"
                placeholder="Observaciones del pago..."
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
              {submitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <><Check className="w-5 h-5" /> Registrar Pago</>
              )}
            </button>
          </form>
        </div>

        {/* Recent payments */}
        <div className="card p-6">
          <h2 className="text-lg font-heading text-brand-black mb-4">Pagos Recientes</h2>
          {recentPayments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No hay pagos registrados</p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <div className="font-medium text-sm text-brand-black">
                      {(p as any).tenants?.full_name || 'Inquilino'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatPeriod(p.period)} · {formatDate(p.registered_at)} · Efectivo
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">{formatCurrency(p.amount, p.currency)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

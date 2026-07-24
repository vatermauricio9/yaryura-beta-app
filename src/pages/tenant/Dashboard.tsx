import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Payment, RentMonth, LeaseContract, Tenant, Currency } from '../../lib/types'
import { formatCurrency, formatPeriod, formatDate, getCurrentPeriod } from '../../lib/utils'
import { TrendingUp, TrendingDown, Wallet, Calendar, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

export default function TenantDashboard() {
  const { user } = useAuth()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [contract, setContract] = useState<LeaseContract | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [rentMonths, setRentMonths] = useState<RentMonth[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  async function loadData() {
    const { data: t } = await supabase
      .from('tenants')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle()
    setTenant(t as Tenant | null)

    if (!t) {
      setLoading(false)
      return
    }

    const { data: c } = await supabase
      .from('lease_contracts')
      .select('*')
      .eq('tenant_id', t.id)
      .eq('active', true)
      .maybeSingle()
    setContract(c as LeaseContract | null)

    const { data: p } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', t.id)
      .order('registered_at', { ascending: false })
    setPayments((p as Payment[]) || [])

    const { data: rm } = await supabase
      .from('rent_months')
      .select('*')
      .eq('tenant_id', t.id)
      .order('period', { ascending: false })
    setRentMonths((rm as RentMonth[]) || [])

    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div></div>
  }

  if (!tenant) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500">No tenés un perfil de inquilino asociado. Contactá a la inmobiliaria.</p>
      </div>
    )
  }

  const currency = (contract?.currency || 'USD') as Currency
  const totalDue = rentMonths.reduce((sum, rm) => sum + Number(rm.amount), 0)
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const balance = totalPaid - totalDue
  const currentPeriod = getCurrentPeriod()

  const currentMonthDue = rentMonths.find((rm) => rm.period === currentPeriod)
  const currentMonthPaid = payments.filter((p) => p.period === currentPeriod).reduce((sum, p) => sum + Number(p.amount), 0)
  const currentMonthBalance = currentMonthPaid - (currentMonthDue ? Number(currentMonthDue.amount) : 0)

  const overdueMonths = rentMonths.filter((rm) => rm.period < currentPeriod)
  const overdueDue = overdueMonths.reduce((sum, rm) => sum + Number(rm.amount), 0)
  const overduePaid = payments.filter((p) => p.period < currentPeriod).reduce((sum, p) => sum + Number(p.amount), 0)
  const overdueBalance = overduePaid - overdueDue

  let status: 'up_to_date' | 'current_debt' | 'overdue_debt' = 'up_to_date'
  if (overdueBalance < 0) status = 'overdue_debt'
  else if (currentMonthBalance < 0) status = 'current_debt'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading text-brand-black mb-1">Mi Estado de Cuenta</h1>
        <p className="text-gray-500 text-sm">{tenant.property_address}</p>
      </div>

      {/* Status banner */}
      <div className={`card p-4 mb-6 ${status === 'up_to_date' ? 'border-l-4 border-l-green-500' : status === 'current_debt' ? 'border-l-4 border-l-yellow-500' : 'border-l-4 border-l-red-500'}`}>
        <div className="flex items-center gap-3">
          {status === 'up_to_date' && <CheckCircle className="w-6 h-6 text-green-500" />}
          {status === 'current_debt' && <Clock className="w-6 h-6 text-yellow-500" />}
          {status === 'overdue_debt' && <AlertTriangle className="w-6 h-6 text-red-500" />}
          <div>
            <p className="font-heading text-brand-black">
              {status === 'up_to_date' && 'Estás al día con tus pagos'}
              {status === 'current_debt' && 'Tenés deuda del mes corriente'}
              {status === 'overdue_debt' && 'Tenés pagos atrasados'}
            </p>
            <p className="text-sm text-gray-500">
              {status === 'up_to_date' && '¡Excelente! Mantené así tu estado de cuenta.'}
              {status === 'current_debt' && 'Comunicate con la inmobiliaria para regularizar.'}
              {status === 'overdue_debt' && 'Por favor, regularizá tu situación a la brevedad.'}
            </p>
          </div>
        </div>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 uppercase font-medium">Saldo Total</p>
            {balance >= 0 ? <TrendingUp className="w-5 h-5 text-green-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
          </div>
          <p className={`text-2xl font-heading ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {balance >= 0 ? '+' : ''}{formatCurrency(balance, currency)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{balance >= 0 ? 'Saldo a favor' : 'Deuda'}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 uppercase font-medium">Mes Actual</p>
            <Calendar className="w-5 h-5 text-brand-red" />
          </div>
          <p className="text-2xl font-heading text-brand-black">{formatCurrency(currentMonthDue ? Number(currentMonthDue.amount) : 0, currency)}</p>
          <p className="text-xs text-gray-400 mt-1">{formatPeriod(currentPeriod)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 uppercase font-medium">Total Pagado</p>
            <Wallet className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-heading text-green-600">{formatCurrency(totalPaid, currency)}</p>
          <p className="text-xs text-gray-400 mt-1">{payments.length} pagos registrados</p>
        </div>
      </div>

      {/* History */}
      <div className="card overflow-hidden">
        <h2 className="font-heading text-brand-black p-4 border-b border-gray-200">Historial de Pagos</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Período</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Método</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No hay pagos registrados</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-brand-black">{formatPeriod(p.period)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(p.amount, p.currency as Currency)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{formatDate(p.registered_at)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">Efectivo</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

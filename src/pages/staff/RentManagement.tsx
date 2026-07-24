import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Tenant, LeaseContract, RentMonth, Currency } from '../../lib/types'
import { formatCurrency, formatPeriod, getCurrentPeriod } from '../../lib/utils'
import { Calendar, Plus, Edit2, Check, X } from 'lucide-react'

export default function StaffRentManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<string>('')
  const [contract, setContract] = useState<LeaseContract | null>(null)
  const [rentMonths, setRentMonths] = useState<RentMonth[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMonth, setShowAddMonth] = useState(false)
  const [newPeriod, setNewPeriod] = useState(getCurrentPeriod())
  const [newAmount, setNewAmount] = useState('')
  const [newCurrency, setNewCurrency] = useState<Currency>('USD')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')

  useEffect(() => {
    loadTenants()
  }, [])

  async function loadTenants() {
    const { data } = await supabase.from('tenants').select('*').order('full_name')
    setTenants((data as Tenant[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    if (selectedTenant) {
      loadTenantData()
    }
  }, [selectedTenant])

  async function loadTenantData() {
    const { data: c } = await supabase
      .from('lease_contracts')
      .select('*')
      .eq('tenant_id', selectedTenant)
      .eq('active', true)
      .maybeSingle()
    setContract(c as LeaseContract | null)

    const { data: rm } = await supabase
      .from('rent_months')
      .select('*')
      .eq('tenant_id', selectedTenant)
      .order('period', { ascending: false })
    setRentMonths((rm as RentMonth[]) || [])
    if (c) setNewCurrency((c as LeaseContract).currency)
  }

  async function handleAddMonth() {
    if (!selectedTenant || !contract || !newAmount) return
    const dueDate = `${newPeriod}-10`

    const { error } = await supabase.from('rent_months').insert({
      contract_id: contract.id,
      tenant_id: selectedTenant,
      period: newPeriod,
      amount: parseFloat(newAmount),
      currency: newCurrency,
      due_date: dueDate,
    })

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setShowAddMonth(false)
      setNewAmount('')
      loadTenantData()
    }
  }

  async function handleEditAmount(id: string) {
    if (!editAmount) return
    const { error } = await supabase
      .from('rent_months')
      .update({ amount: parseFloat(editAmount) })
      .eq('id', id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setEditingId(null)
      loadTenantData()
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div></div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading text-brand-black mb-1">Montos de Alquiler</h1>
        <p className="text-gray-500 text-sm">Gestión de montos mensuales por inquilino (ajustes por IPC)</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Inquilino</label>
        <select
          value={selectedTenant}
          onChange={(e) => setSelectedTenant(e.target.value)}
          className="input-field max-w-md"
        >
          <option value="">Seleccionar...</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.full_name} - {t.property_address}</option>
          ))}
        </select>
      </div>

      {selectedTenant && (
        <div className="space-y-6">
          {/* Contract info */}
          {contract ? (
            <div className="card p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Moneda</p>
                  <p className="font-medium">{contract.currency}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Monto Inicial</p>
                  <p className="font-medium">{formatCurrency(contract.monthly_amount, contract.currency as Currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Inicio</p>
                  <p className="font-medium">{contract.start_date}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Fin</p>
                  <p className="font-medium">{contract.end_date || 'Indefinido'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-6 text-center">
              <p className="text-gray-500">No hay un contrato activo para este inquilino.</p>
            </div>
          )}

          {/* Rent months */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="font-heading text-brand-black">Meses de Alquiler</h2>
              {contract && (
                <button
                  onClick={() => setShowAddMonth(!showAddMonth)}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" /> Agregar Mes
                </button>
              )}
            </div>

            {showAddMonth && (
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Período</label>
                    <input type="month" value={newPeriod} onChange={(e) => setNewPeriod(e.target.value)} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Monto</label>
                    <input type="number" step="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0.00" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Moneda</label>
                    <select value={newCurrency} onChange={(e) => setNewCurrency(e.target.value as Currency)} className="input-field">
                      <option value="USD">USD</option>
                      <option value="ARS">ARS</option>
                    </select>
                  </div>
                  <button onClick={handleAddMonth} className="btn-primary flex items-center gap-2">
                    <Check className="w-4 h-4" /> Guardar
                  </button>
                  <button onClick={() => setShowAddMonth(false)} className="btn-ghost flex items-center gap-1">
                    <X className="w-4 h-4" /> Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Período</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rentMonths.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-400">No hay meses cargados</td></tr>
                  ) : (
                    rentMonths.map((rm) => (
                      <tr key={rm.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-brand-black">{formatPeriod(rm.period)}</td>
                        <td className="px-4 py-3 text-right">
                          {editingId === rm.id ? (
                            <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="input-field w-32 text-right" autoFocus />
                          ) : (
                            formatCurrency(rm.amount, rm.currency as Currency)
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">{rm.due_date}</td>
                        <td className="px-4 py-3 text-center">
                          {editingId === rm.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleEditAmount(rm.id)} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingId(rm.id); setEditAmount(String(rm.amount)) }} className="text-gray-400 hover:text-brand-red">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!selectedTenant && (
        <div className="card p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Seleccioná un inquilino para ver y gestionar sus montos de alquiler</p>
        </div>
      )}
    </div>
  )
}

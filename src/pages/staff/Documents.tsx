import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { TenantDocument, Tenant, DocumentCategory, DocumentStatus } from '../../lib/types'
import { formatPeriod, formatDate, getCurrentPeriod } from '../../lib/utils'
import { FileText, Check, X, Eye, Printer, Filter } from 'lucide-react'

export default function StaffDocuments() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<(TenantDocument & { tenants: { full_name: string; property_address: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | DocumentStatus>('all')
  const [filterCategory, setFilterCategory] = useState<'all' | DocumentCategory>('all')
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    loadDocuments()
  }, [])

  async function loadDocuments() {
    setLoading(true)
    const { data } = await supabase
      .from('tenant_documents')
      .select(`
        *,
        tenants!inner(full_name, property_address)
      `)
      .order('uploaded_at', { ascending: false })
    setDocuments((data as any) || [])
    setLoading(false)
  }

  async function handleApprove(id: string) {
    if (!user) return
    const { error } = await supabase
      .from('tenant_documents')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      loadDocuments()
    }
  }

  async function handleReject(id: string) {
    if (!user || !rejectReason) return
    const { error } = await supabase
      .from('tenant_documents')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectReason,
      })
      .eq('id', id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setRejectingId(null)
      setRejectReason('')
      loadDocuments()
    }
  }

  async function handleView(doc: TenantDocument) {
    const { data } = await supabase.storage
      .from('tenant-docs')
      .createSignedUrl(doc.file_path, 3600)

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  async function handlePrint(doc: TenantDocument & { tenants: { full_name: string; property_address: string } }) {
    const { data } = await supabase.storage
      .from('tenant-docs')
      .createSignedUrl(doc.file_path, 3600)

    if (data?.signedUrl) {
      const win = window.open(data.signedUrl, '_blank')
      if (win) {
        win.onload = () => win.print()
      }
    }
  }

  function handlePrintAll() {
    window.print()
  }

  const periods = [...new Set(documents.map((d) => d.period))].sort().reverse()

  const filtered = documents.filter((d) => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false
    if (filterCategory !== 'all' && d.category !== filterCategory) return false
    if (filterPeriod !== 'all' && d.period !== filterPeriod) return false
    if (searchTerm && !d.tenants?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const categoryLabels: Record<DocumentCategory, string> = {
    service_bill: 'Factura de Servicio',
    payment_receipt: 'Comprobante de Pago',
    other: 'Otro',
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 className="text-2xl font-heading text-brand-black mb-1">Documentación</h1>
          <p className="text-gray-500 text-sm">Revisión de documentos subidos por inquilinos</p>
        </div>
        <button onClick={handlePrintAll} className="btn-secondary flex items-center gap-2">
          <Printer className="w-5 h-5" /> Imprimir Todo
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 no-print">
        <input
          type="text"
          placeholder="Buscar por inquilino..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field flex-1"
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="input-field sm:w-40">
          <option value="all">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="approved">Aprobados</option>
          <option value="rejected">Rechazados</option>
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as any)} className="input-field sm:w-44">
          <option value="all">Todas las categorías</option>
          <option value="service_bill">Facturas de Servicio</option>
          <option value="payment_receipt">Comprobantes de Pago</option>
          <option value="other">Otros</option>
        </select>
        <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="input-field sm:w-36">
          <option value="all">Todos los períodos</option>
          {periods.map((p) => <option key={p} value={p}>{formatPeriod(p)}</option>)}
        </select>
      </div>

      {/* Print header */}
      <div className="print-only mb-6">
        <h1 className="text-xl font-heading">Yaryura Propiedades - Documentación</h1>
        <p className="text-sm text-gray-600">Fecha: {formatDate(new Date().toISOString())}</p>
      </div>

      {/* Documents list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No hay documentos para mostrar</p>
          </div>
        ) : (
          filtered.map((doc) => (
            <div key={doc.id} className="card p-4 no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="font-medium text-brand-black">{doc.file_name}</div>
                    <div className="text-sm text-gray-500">
                      {doc.tenants?.full_name} · {categoryLabels[doc.category]} · {formatPeriod(doc.period)}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Subido: {formatDate(doc.uploaded_at)}
                      {doc.reviewed_at && ` · Revisado: ${formatDate(doc.reviewed_at)}`}
                    </div>
                    {doc.status === 'rejected' && doc.rejection_reason && (
                      <div className="text-xs text-red-600 mt-1">Motivo: {doc.rejection_reason}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {doc.status === 'pending' && <span className="badge badge-warning">Pendiente</span>}
                  {doc.status === 'approved' && <span className="badge badge-success">Aprobado</span>}
                  {doc.status === 'rejected' && <span className="badge badge-danger">Rechazado</span>}

                  <button onClick={() => handleView(doc)} className="btn-ghost" title="Ver documento">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => handlePrint(doc)} className="btn-ghost" title="Imprimir">
                    <Printer className="w-4 h-4" />
                  </button>

                  {doc.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(doc.id)} className="text-green-600 hover:text-green-700 p-2 rounded-md hover:bg-green-50" title="Aprobar">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setRejectingId(doc.id)} className="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50" title="Rechazar">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {rejectingId === doc.id && (
                <div className="mt-3 p-3 bg-red-50 rounded-md flex flex-col sm:flex-row gap-2 items-end">
                  <input
                    type="text"
                    placeholder="Motivo del rechazo..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="input-field flex-1"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleReject(doc.id)} className="btn-primary text-sm">Confirmar Rechazo</button>
                    <button onClick={() => { setRejectingId(null); setRejectReason('') }} className="btn-ghost text-sm">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

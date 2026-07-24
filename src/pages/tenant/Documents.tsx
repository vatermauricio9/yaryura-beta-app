import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { TenantDocument, DocumentCategory, Tenant } from '../../lib/types'
import { formatPeriod, formatDate, getCurrentPeriod } from '../../lib/utils'
import { Upload, FileText, Check, X, Clock, Eye } from 'lucide-react'

export default function TenantDocuments() {
  const { user } = useAuth()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [documents, setDocuments] = useState<TenantDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadData, setUploadData] = useState({
    category: 'service_bill' as DocumentCategory,
    period: getCurrentPeriod(),
    file: null as File | null,
  })
  const [message, setMessage] = useState<string | null>(null)

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

    if (t) {
      const { data: docs } = await supabase
        .from('tenant_documents')
        .select('*')
        .eq('tenant_id', t.id)
        .order('uploaded_at', { ascending: false })
      setDocuments((docs as TenantDocument[]) || [])
    }
    setLoading(false)
  }

  async function handleUpload() {
    if (!tenant || !uploadData.file) return
    setUploading(true)
    setMessage(null)

    const file = uploadData.file
    const fileExt = file.name.split('.').pop()
    const fileName = `${tenant.id}/${uploadData.period}/${uploadData.category}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('tenant-docs')
      .upload(fileName, file)

    if (uploadError) {
      setMessage('Error al subir archivo: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { error: dbError } = await supabase.from('tenant_documents').insert({
      tenant_id: tenant.id,
      category: uploadData.category,
      file_name: file.name,
      file_path: fileName,
      status: 'pending',
      period: uploadData.period,
    })

    if (dbError) {
      setMessage('Error al registrar documento: ' + dbError.message)
    } else {
      setMessage('Documento subido correctamente')
      setShowUpload(false)
      setUploadData({ category: 'service_bill', period: getCurrentPeriod(), file: null })
      loadData()
    }
    setUploading(false)
  }

  async function handleView(doc: TenantDocument) {
    const { data } = await supabase.storage
      .from('tenant-docs')
      .createSignedUrl(doc.file_path, 3600)
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  const categoryLabels: Record<DocumentCategory, string> = {
    service_bill: 'Factura de Servicio',
    payment_receipt: 'Comprobante de Pago',
    other: 'Otro',
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div></div>
  }

  if (!tenant) {
    return <div className="card p-8 text-center"><p className="text-gray-500">No tenés un perfil de inquilino asociado.</p></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading text-brand-black mb-1">Mis Documentos</h1>
          <p className="text-gray-500 text-sm">Subí tus facturas y comprobantes mensuales</p>
        </div>
        <button onClick={() => setShowUpload(!showUpload)} className="btn-primary flex items-center gap-2">
          <Upload className="w-5 h-5" /> Subir Documento
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-sm">{message}</div>
      )}

      {showUpload && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-heading text-brand-black mb-4">Subir Nuevo Documento</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={uploadData.category}
                onChange={(e) => setUploadData({ ...uploadData, category: e.target.value as DocumentCategory })}
                className="input-field"
              >
                <option value="service_bill">Factura de Servicio</option>
                <option value="payment_receipt">Comprobante de Pago</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
              <input
                type="month"
                value={uploadData.period}
                onChange={(e) => setUploadData({ ...uploadData, period: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Archivo</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                className="input-field"
              />
              <p className="text-xs text-gray-400 mt-1">Formatos aceptados: PDF, JPG, PNG</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleUpload} disabled={uploading || !uploadData.file} className="btn-primary flex items-center gap-2">
                {uploading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Upload className="w-4 h-4" />}
                Subir
              </button>
              <button onClick={() => setShowUpload(false)} className="btn-ghost">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {documents.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No subiste documentos aún</p>
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="card p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="font-medium text-brand-black">{doc.file_name}</div>
                    <div className="text-sm text-gray-500">
                      {categoryLabels[doc.category]} · {formatPeriod(doc.period)}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">Subido: {formatDate(doc.uploaded_at)}</div>
                    {doc.status === 'rejected' && doc.rejection_reason && (
                      <div className="text-xs text-red-600 mt-1">Rechazado: {doc.rejection_reason}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.status === 'pending' && <span className="badge badge-warning"><Clock className="w-3 h-3 mr-1" /> Pendiente</span>}
                  {doc.status === 'approved' && <span className="badge badge-success"><Check className="w-3 h-3 mr-1" /> Aprobado</span>}
                  {doc.status === 'rejected' && <span className="badge badge-danger"><X className="w-3 h-3 mr-1" /> Rechazado</span>}
                  <button onClick={() => handleView(doc)} className="btn-ghost" title="Ver documento">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

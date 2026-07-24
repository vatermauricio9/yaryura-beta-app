import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Building2, Lock, Mail, Download } from 'lucide-react'

export default function Login() {
  const { signIn, profile } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (profile) {
      navigate(profile.role === 'staff' ? '/staff' : '/inquilino', { replace: true })
    }
  }, [profile, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-black via-gray-900 to-brand-red-dark px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-red rounded-lg mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-heading text-white">Yaryura Propiedades</h1>
          <p className="text-gray-400 mt-1 text-sm">Gestión de Alquileres</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-heading text-brand-black mb-6">Iniciar Sesión</h2>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-field pl-10"
                  placeholder="su@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-field pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/yaryura-gestion.zip"
            download="yaryura-gestion.zip"
            className="inline-flex items-center gap-2 text-sm text-brand-red hover:text-brand-red/80 font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Descargar código del proyecto (ZIP)
          </a>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          Yaryura Propiedades · Desde 1948 en el mercado inmobiliario
        </p>
      </div>
    </div>
  )
}

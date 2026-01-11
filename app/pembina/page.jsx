'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Navbar from '../../components/Navbar'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useConfirm, useToast } from '../../components/UiProvider'
import { 
  fetchData, 
  insertData, 
  updateData, 
  deactivateData, 
  getCurrentUser,
  getUserProfile,
  supabase,
} from '../../lib/supabaseClient'
import { buildCsv, downloadCsv, statusLabel } from '../../lib/exportCsv'

export default function PembinaPage() {
  const toast = useToast()
  const { confirm } = useConfirm()

  const realtimeRef = useRef({ timeoutId: null, lastToastAt: 0 })

  const [pembina, setPembina] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [formData, setFormData] = useState({
    nama: '',
    peran: '',
    kontak: '',
    keterangan: ''
  })

  const loadCurrentUser = useCallback(async () => {
    const user = await getCurrentUser()
    setCurrentUser(user)

    if (user) {
      const { data: userProfile } = await getUserProfile(user.id)
      setProfile(userProfile)
    } else {
      setProfile(null)
    }
  }, [])

  const canExport = profile && ['ketua_humas', 'sekretaris_humas'].includes(profile.role)

  const handleExportCsv = async () => {
    if (!canExport || exporting) return

    setExporting(true)
    try {
      const { data, error } = await supabase
        .from('pembina')
        .select('nama,peran,kontak,keterangan,is_active,created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      const headers = ['Nama', 'Peran', 'Kontak', 'Keterangan', 'Status']
      const rows = (data || []).map((item) => [
        item.nama,
        item.peran,
        item.kontak,
        item.keterangan || '',
        statusLabel(item.is_active),
      ])

      const csv = buildCsv(headers, rows)
      downloadCsv(csv, 'pembina.csv')
    } catch (error) {
      console.error('Error exporting CSV:', error)
      toast.error('Gagal export CSV')
    } finally {
      setExporting(false)
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data, error } = await fetchData('pembina', { is_active: true })
    if (!error && data) {
      setPembina(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
    void loadCurrentUser()
  }, [loadCurrentUser, loadData])

  const scheduleRealtimeRefresh = useCallback(() => {
    if (realtimeRef.current.timeoutId) return

    const now = Date.now()
    if (now - realtimeRef.current.lastToastAt > 5000) {
      toast.info('Ada perubahan data pembina. Memuat ulang...')
      realtimeRef.current.lastToastAt = now
    }

    realtimeRef.current.timeoutId = setTimeout(() => {
      realtimeRef.current.timeoutId = null
      void loadData()
    }, 600)
  }, [loadData, toast])

  useEffect(() => {
    if (!currentUser) return

    const ref = realtimeRef.current
    const channel = supabase
      .channel('realtime-pembina')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pembina' },
        () => {
          scheduleRealtimeRefresh()
        }
      )
      .subscribe()

    return () => {
      if (ref.timeoutId) {
        clearTimeout(ref.timeoutId)
        ref.timeoutId = null
      }
      supabase.removeChannel(channel)
    }
  }, [currentUser, scheduleRealtimeRefresh])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!currentUser) return

    try {
      if (editingId) {
        const { error } = await updateData('pembina', editingId, formData, currentUser.id)
        if (!error) {
          toast.success('Data berhasil diupdate')
        }
      } else {
        const { error } = await insertData('pembina', formData, currentUser.id)
        if (!error) {
          toast.success('Data berhasil ditambahkan')
        }
      }
      
      resetForm()
      loadData()
    } catch (error) {
      console.error('Error saving data:', error)
      toast.error('Terjadi kesalahan saat menyimpan data')
    }
  }

  const handleEdit = (item) => {
    setFormData({
      nama: item.nama,
      peran: item.peran,
      kontak: item.kontak,
      keterangan: item.keterangan || ''
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDeactivate = async (id) => {
    if (!currentUser) return

    const ok = await confirm({
      title: 'Konfirmasi',
      message: 'Yakin ingin menonaktifkan data ini?',
      confirmText: 'Ya',
      cancelText: 'Batal',
      danger: true,
    })

    if (ok) {
      const { error } = await deactivateData('pembina', id, currentUser.id)
      if (!error) {
        toast.success('Data berhasil dinonaktifkan')
        loadData()
      }
    }
  }

  const resetForm = () => {
    setFormData({
      nama: '',
      peran: '',
      kontak: '',
      keterangan: ''
    })
    setEditingId(null)
    setShowForm(false)
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="min-h-screen bg-pagebg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-primary">Data Pembina</h1>
              <p className="mt-2 text-secondary">Kelola data pembina HUMAS GAMADA</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              Tambah Pembina
            </button>
          </div>

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">
                  {editingId ? 'Edit Pembina' : 'Tambah Pembina'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="form-label">Nama</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={formData.nama}
                      onChange={(e) => setFormData({...formData, nama: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="form-label">Peran</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={formData.peran}
                      onChange={(e) => setFormData({...formData, peran: e.target.value})}
                      placeholder="Contoh: Pembina Utama, Pembina Ahli"
                    />
                  </div>

                  <div>
                    <label className="form-label">Kontak</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={formData.kontak}
                      onChange={(e) => setFormData({...formData, kontak: e.target.value})}
                      placeholder="No. HP atau Email"
                    />
                  </div>

                  <div>
                    <label className="form-label">Keterangan</label>
                    <textarea
                      className="form-input"
                      rows="3"
                      value={formData.keterangan}
                      onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                      placeholder="Keterangan tambahan (opsional)"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button type="submit" className="btn-primary flex-1">
                      {editingId ? 'Update' : 'Simpan'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn-secondary flex-1"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="flex justify-end p-3 border-b border-gray-200">
              {canExport && (
                <button
                  type="button"
                  onClick={handleExportCsv}
                  title="Unduh data CSV"
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {exporting ? 'Mengunduh...' : 'Export CSV'}
                </button>
              )}
            </div>
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th>Peran</th>
                    <th>Kontak</th>
                    <th>Keterangan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {pembina.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-gray-500">
                        Belum ada data pembina
                      </td>
                    </tr>
                  ) : (
                    pembina.map((item) => (
                      <tr key={item.id}>
                        <td className="font-medium">{item.nama}</td>
                        <td>{item.peran}</td>
                        <td>{item.kontak}</td>
                        <td>{item.keterangan || '-'}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-primary hover:text-primary/80 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeactivate(item.id)}
                              className="text-secondary hover:text-primary text-sm"
                            >
                              Nonaktifkan
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
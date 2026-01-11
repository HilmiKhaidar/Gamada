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

export default function MitraPage() {
  const toast = useToast()
  const { confirm } = useConfirm()

  const realtimeRef = useRef({ timeoutId: null, lastToastAt: 0 })

  const [mitra, setMitra] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [formData, setFormData] = useState({
    nama_lembaga: '',
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
        .from('mitra')
        .select('nama_lembaga,kontak,keterangan,is_active,created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      const headers = ['Nama Lembaga', 'Kontak', 'Keterangan', 'Status']
      const rows = (data || []).map((item) => [
        item.nama_lembaga,
        item.kontak,
        item.keterangan || '',
        statusLabel(item.is_active),
      ])

      const csv = buildCsv(headers, rows)
      downloadCsv(csv, 'mitra.csv')
    } catch (error) {
      console.error('Error exporting CSV:', error)
      toast.error('Gagal export CSV')
    } finally {
      setExporting(false)
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data, error } = await fetchData('mitra', { is_active: true })
    if (!error && data) {
      setMitra(data)
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
      toast.info('Ada perubahan data mitra. Memuat ulang...')
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
      .channel('realtime-mitra')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mitra' },
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
        const { error } = await updateData('mitra', editingId, formData, currentUser.id)
        if (!error) {
          toast.success('Data berhasil diupdate')
        }
      } else {
        const { error } = await insertData('mitra', formData, currentUser.id)
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
      nama_lembaga: item.nama_lembaga,
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
      const { error } = await deactivateData('mitra', id, currentUser.id)
      if (!error) {
        toast.success('Data berhasil dinonaktifkan')
        loadData()
      }
    }
  }

  const resetForm = () => {
    setFormData({
      nama_lembaga: '',
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
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-primary">Data Mitra</h1>
              <p className="mt-2 text-secondary">Kelola data mitra kerjasama HUMAS GAMADA</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              Tambah Mitra
            </button>
          </div>

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">
                  {editingId ? 'Edit Mitra' : 'Tambah Mitra'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="form-label">Nama Lembaga</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={formData.nama_lembaga}
                      onChange={(e) => setFormData({...formData, nama_lembaga: e.target.value})}
                      placeholder="Nama lembaga/organisasi mitra"
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
                      placeholder="No. HP, Email, atau alamat"
                    />
                  </div>

                  <div>
                    <label className="form-label">Keterangan</label>
                    <textarea
                      className="form-input"
                      rows="3"
                      value={formData.keterangan}
                      onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                      placeholder="Jenis kerjasama, bidang, dll (opsional)"
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
                    <th>Nama Lembaga</th>
                    <th>Kontak</th>
                    <th>Keterangan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {mitra.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-gray-500">
                        Belum ada data mitra
                      </td>
                    </tr>
                  ) : (
                    mitra.map((item) => (
                      <tr key={item.id}>
                        <td className="font-medium">{item.nama_lembaga}</td>
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
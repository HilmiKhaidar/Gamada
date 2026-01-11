'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Navbar from '../../components/Navbar'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useConfirm, useToast } from '../../components/UiProvider'
import {
  fetchData,
  getCurrentUser,
  getUserProfile,
  insertData,
  supabase,
  updateData,
} from '../../lib/supabaseClient'

function formatTanggal(dateValue) {
  if (!dateValue) return '-'
  // dateValue from Supabase DATE is usually "YYYY-MM-DD"
  const [y, m, d] = String(dateValue).split('-')
  if (!y || !m || !d) return String(dateValue)
  return `${d}/${m}/${y}`
}

export default function AgendaPage() {
  const toast = useToast()
  const { confirm } = useConfirm()

  const realtimeRef = useRef({ timeoutId: null, lastToastAt: 0 })

  const [agenda, setAgenda] = useState([])
  const [mitraOptions, setMitraOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    nama_kegiatan: '',
    tanggal: '',
    jenis: 'internal',
    mitra_id: '',
    catatan_hasil: '',
    status: 'rencana',
  })

  const loadAgenda = useCallback(async () => {
    const { data, error } = await supabase
      .from('agenda_humas')
      .select('id,nama_kegiatan,tanggal,jenis,status,mitra_id,catatan_hasil,is_active,created_at')
      .eq('is_active', true)
      .order('tanggal', { ascending: true })
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAgenda(data)
    }
  }, [])

  const loadMitra = useCallback(async () => {
    const { data, error } = await fetchData('mitra', { is_active: true })
    if (!error && data) {
      const minimal = data.map((m) => ({ id: m.id, nama_lembaga: m.nama_lembaga }))
      setMitraOptions(minimal)
    }
  }, [])

  const role = profile?.role
  const canAdd = !!role && ['ketua_humas', 'sekretaris_humas', 'staff_humas'].includes(role)
  const canEdit = canAdd
  const canUpdateStatus = !!role && ['ketua_humas', 'sekretaris_humas'].includes(role)

  const mitraById = useMemo(() => {
    const map = new Map()
    mitraOptions.forEach((m) => map.set(m.id, m.nama_lembaga))
    return map
  }, [mitraOptions])

  const loadInitial = useCallback(async () => {
    setLoading(true)
    try {
      const user = await getCurrentUser()
      setCurrentUser(user)

      if (user) {
        const { data: userProfile } = await getUserProfile(user.id)
        setProfile(userProfile)
      } else {
        setProfile(null)
      }

      await Promise.all([loadAgenda(), loadMitra()])
    } catch (error) {
      console.error('Error loading agenda page:', error)
    } finally {
      setLoading(false)
    }
  }, [loadAgenda, loadMitra])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  const scheduleRealtimeRefresh = useCallback(() => {
    if (realtimeRef.current.timeoutId) return

    const now = Date.now()
    if (now - realtimeRef.current.lastToastAt > 5000) {
      toast.info('Ada perubahan agenda. Memuat ulang...')
      realtimeRef.current.lastToastAt = now
    }

    realtimeRef.current.timeoutId = setTimeout(() => {
      realtimeRef.current.timeoutId = null
      void loadAgenda()
    }, 600)
  }, [loadAgenda, toast])

  useEffect(() => {
    if (!currentUser) return

    const ref = realtimeRef.current

    const channel = supabase
      .channel('realtime-agenda-humas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agenda_humas' },
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

  const openCreate = () => {
    setEditingId(null)
    setFormData({
      nama_kegiatan: '',
      tanggal: '',
      jenis: 'internal',
      mitra_id: '',
      catatan_hasil: '',
      status: 'rencana',
    })
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setFormData({
      nama_kegiatan: item.nama_kegiatan || '',
      tanggal: item.tanggal || '',
      jenis: item.jenis || 'internal',
      mitra_id: item.mitra_id || '',
      catatan_hasil: item.catatan_hasil || '',
      status: item.status || 'rencana',
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentUser || !canAdd || saving) return

    setSaving(true)
    try {
      const payload = {
        nama_kegiatan: formData.nama_kegiatan,
        tanggal: formData.tanggal,
        jenis: formData.jenis,
        mitra_id: formData.mitra_id || null,
        catatan_hasil: formData.catatan_hasil || null,
      }

      if (editingId) {
        if (!canEdit) return
        const { error } = await updateData(
          'agenda_humas',
          editingId,
          {
            ...payload,
            updated_at: new Date().toISOString(),
          },
          currentUser.id
        )

        if (error) {
          toast.error('Gagal mengupdate agenda')
          return
        }

        toast.success('Agenda berhasil diupdate')
      } else {
        const { error } = await insertData(
          'agenda_humas',
          {
            ...payload,
            status: 'rencana',
            created_by: currentUser.id,
          },
          currentUser.id
        )

        if (error) {
          toast.error('Gagal menambah agenda')
          return
        }

        toast.success('Agenda berhasil ditambahkan')
      }

      closeForm()
      await loadAgenda()
    } catch (error) {
      console.error('Error saving agenda:', error)
      toast.error('Terjadi kesalahan saat menyimpan agenda')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkSelesai = async (item) => {
    if (!currentUser || !canUpdateStatus || saving) return
    if (item.status !== 'rencana') return

    const ok = await confirm({
      title: 'Konfirmasi',
      message: 'Tandai agenda ini sebagai selesai?',
      confirmText: 'Ya',
      cancelText: 'Batal',
      danger: false,
    })
    if (!ok) return

    setSaving(true)
    try {
      const { error } = await updateData(
        'agenda_humas',
        item.id,
        {
          status: 'selesai',
          updated_at: new Date().toISOString(),
        },
        currentUser.id
      )

      if (error) {
        toast.error('Gagal mengubah status')
        return
      }

      await loadAgenda()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Terjadi kesalahan saat mengubah status')
    } finally {
      setSaving(false)
    }
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
              <h1 className="text-3xl font-bold text-primary">Agenda Kegiatan HUMAS</h1>
              <p className="mt-2 text-secondary">Daftar agenda kegiatan (list)</p>
            </div>
            {canAdd && (
              <button onClick={openCreate} className="btn-primary">
                Tambah Agenda
              </button>
            )}
          </div>

          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-primary">
                  {editingId ? 'Edit Agenda' : 'Tambah Agenda'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="form-label">Nama Kegiatan</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={formData.nama_kegiatan}
                      onChange={(e) => setFormData({ ...formData, nama_kegiatan: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Tanggal</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={formData.tanggal}
                      onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Jenis</label>
                    <select
                      className="form-input"
                      value={formData.jenis}
                      onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
                    >
                      <option value="internal">internal</option>
                      <option value="eksternal">eksternal</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Mitra (opsional)</label>
                    <select
                      className="form-input"
                      value={formData.mitra_id}
                      onChange={(e) => setFormData({ ...formData, mitra_id: e.target.value })}
                    >
                      <option value="">-</option>
                      {mitraOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nama_lembaga}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Catatan Hasil (opsional)</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={formData.catatan_hasil}
                      onChange={(e) => setFormData({ ...formData, catatan_hasil: e.target.value })}
                      placeholder="Catatan hasil kegiatan"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button type="submit" className="btn-primary flex-1" disabled={saving}>
                      {saving ? 'Menyimpan...' : editingId ? 'Update' : 'Simpan'}
                    </button>
                    <button type="button" onClick={closeForm} className="btn-secondary flex-1" disabled={saving}>
                      Batal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow">
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th>Nama Kegiatan</th>
                    <th>Tanggal</th>
                    <th>Jenis</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {agenda.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-secondary">
                        Belum ada agenda
                      </td>
                    </tr>
                  ) : (
                    agenda.map((item) => (
                      <tr key={item.id}>
                        <td className="font-medium">
                          {item.nama_kegiatan}
                          {item.mitra_id && (
                            <div className="text-xs text-secondary">
                              Mitra: {mitraById.get(item.mitra_id) || '—'}
                            </div>
                          )}
                        </td>
                        <td>{formatTanggal(item.tanggal)}</td>
                        <td className="capitalize">{item.jenis}</td>
                        <td className="capitalize">{item.status}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => openEdit(item)}
                                className="text-primary hover:text-primary/80 text-sm"
                              >
                                Edit
                              </button>
                            )}
                            {canUpdateStatus && item.status === 'rencana' && (
                              <button
                                type="button"
                                onClick={() => handleMarkSelesai(item)}
                                className="text-secondary hover:text-primary text-sm"
                              >
                                Tandai Selesai
                              </button>
                            )}
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

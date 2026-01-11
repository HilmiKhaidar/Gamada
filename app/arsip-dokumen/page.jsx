'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Navbar from '../../components/Navbar'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useConfirm, useToast } from '../../components/UiProvider'
import {
  deactivateData,
  fetchData,
  getCurrentUser,
  getUserProfile,
  insertData,
  supabase,
  updateData,
} from '../../lib/supabaseClient'

const DEFAULT_BUCKET_NAME = 'arsip-dokumen'
const BUCKET_NAME = process.env.NEXT_PUBLIC_SUPABASE_ARSIP_BUCKET || DEFAULT_BUCKET_NAME
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB
const JENIS_DOKUMEN = ['undangan', 'balasan', 'proposal', 'mou']

function getStorageErrorMessage(error) {
  const message = String(error?.message || '')
  const messageLower = message.toLowerCase()

  if (messageLower.includes('bucket not found')) {
    return (
      `Bucket Supabase Storage "${BUCKET_NAME}" tidak ditemukan. ` +
      `Buat bucket tersebut di Supabase (Storage -> Buckets), atau set NEXT_PUBLIC_SUPABASE_ARSIP_BUCKET di .env.local sesuai nama bucket yang ada.`
    )
  }

  // Common Supabase Storage policy/RLS error when bucket exists but policies disallow access.
  if (
    messageLower.includes('row-level security') ||
    messageLower.includes('new row violates') ||
    messageLower.includes('not allowed') ||
    messageLower.includes('unauthorized') ||
    messageLower.includes('permission') ||
    String(error?.status || error?.statusCode || '') === '403'
  ) {
    return (
      'Akses ke Supabase Storage ditolak (policy/RLS). ' +
      'Pastikan sudah membuat policy untuk `storage.objects` agar role HUMAS boleh upload & read di bucket ini.'
    )
  }

  return message || 'Gagal upload dokumen'
}

function formatTanggal(dateValue) {
  if (!dateValue) return '-'
  // dateValue from Supabase DATE is usually "YYYY-MM-DD"
  const [y, m, d] = String(dateValue).split('-')
  if (!y || !m || !d) return String(dateValue)
  return `${d}/${m}/${y}`
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function yearFromDate(dateStr) {
  if (!dateStr) return new Date().getFullYear()
  const y = Number(String(dateStr).slice(0, 4))
  return Number.isFinite(y) && y > 1900 ? y : new Date().getFullYear()
}

function buildStoragePath({ judul, jenis, tanggal, originalName }) {
  const year = yearFromDate(tanggal)

  let titleSlug = slugify(judul)
  if (titleSlug.startsWith(`${jenis}-`)) {
    titleSlug = titleSlug.slice(jenis.length + 1)
  }

  const baseName = `surat-${jenis}-${titleSlug || 'dokumen'}`
  const safeBase = baseName.replace(/-+/g, '-')

  const filename = `${safeBase}.pdf`

  return `${year}/${filename}`
}

function TrashIcon({ className = 'w-4 h-4' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M9 3h6m-7 4h8m-9 0h10m-1 0-1 14a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2L7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 11v7m4-7v7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function ArsipDokumenPage() {
  const toast = useToast()
  const { confirm } = useConfirm()

  const realtimeRef = useRef({ timeoutId: null, lastToastAt: 0 })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const [arsip, setArsip] = useState([])
  const [trash, setTrash] = useState([])
  const [trashCount, setTrashCount] = useState(0)
  const [showTrash, setShowTrash] = useState(false)
  const [mitraOptions, setMitraOptions] = useState([])

  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadForm, setUploadForm] = useState({
    judul_dokumen: '',
    jenis_dokumen: 'undangan',
    tanggal_dokumen: '',
    mitra_id: '',
    keterangan: '',
  })

  const [showEdit, setShowEdit] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({
    judul_dokumen: '',
    jenis_dokumen: 'undangan',
    tanggal_dokumen: '',
    mitra_id: '',
    keterangan: '',
  })

  const role = profile?.role
  const canUpload = !!role && ['ketua_humas', 'sekretaris_humas', 'staff_humas'].includes(role)
  const canEdit = !!role && ['ketua_humas', 'sekretaris_humas'].includes(role)
  const canDelete = canEdit
  const canManageTrash = canDelete
  const canDownload = canUpload

  const mitraById = useMemo(() => {
    const map = new Map()
    mitraOptions.forEach((m) => map.set(m.id, m.nama_lembaga))
    return map
  }, [mitraOptions])

  const loadMitra = useCallback(async () => {
    const { data, error } = await fetchData('mitra', { is_active: true })
    if (!error && data) {
      setMitraOptions(data.map((m) => ({ id: m.id, nama_lembaga: m.nama_lembaga })))
    }
  }, [])

  const loadArsip = useCallback(async () => {
    const { data, error } = await supabase
      .from('arsip_dokumen_humas')
      .select('id,judul_dokumen,jenis_dokumen,tanggal_dokumen,mitra_id,file_path,keterangan,is_active,created_at')
      .eq('is_active', true)
      .order('tanggal_dokumen', { ascending: false })
      .order('created_at', { ascending: false })

    if (!error && data) {
      setArsip(data)
    }
  }, [])

  const loadTrashCount = useCallback(async () => {
    const { count, error } = await supabase
      .from('arsip_dokumen_humas')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', false)

    if (!error) {
      setTrashCount(count || 0)
    }
  }, [])

  const loadTrash = useCallback(async () => {
    const { data, error } = await supabase
      .from('arsip_dokumen_humas')
      .select('id,judul_dokumen,jenis_dokumen,tanggal_dokumen,mitra_id,file_path,keterangan,is_active,created_at')
      .eq('is_active', false)
      .order('tanggal_dokumen', { ascending: false })
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTrash(data)
    }
  }, [])

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

      await Promise.all([loadArsip(), loadMitra(), loadTrashCount()])
    } catch (error) {
      console.error('Error loading arsip page:', error)
    } finally {
      setLoading(false)
    }
  }, [loadArsip, loadMitra, loadTrashCount])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  const scheduleRealtimeRefresh = useCallback(() => {
    if (realtimeRef.current.timeoutId) return

    const now = Date.now()
    if (now - realtimeRef.current.lastToastAt > 5000) {
      toast.info('Ada perubahan data arsip. Memuat ulang...')
      realtimeRef.current.lastToastAt = now
    }

    realtimeRef.current.timeoutId = setTimeout(() => {
      realtimeRef.current.timeoutId = null

      void (async () => {
        await loadArsip()
        await loadTrashCount()
        if (showTrash) {
          await loadTrash()
        }
      })()
    }, 600)
  }, [loadArsip, loadTrash, loadTrashCount, showTrash, toast])

  useEffect(() => {
    if (!currentUser) return

    const ref = realtimeRef.current

    const channel = supabase
      .channel('realtime-arsip-dokumen-humas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'arsip_dokumen_humas' },
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

  const openUpload = () => {
    setUploadFile(null)
    setUploadForm({
      judul_dokumen: '',
      jenis_dokumen: 'undangan',
      tanggal_dokumen: '',
      mitra_id: '',
      keterangan: '',
    })
    setShowUpload(true)
  }

  const closeUpload = () => {
    setShowUpload(false)
    setUploadFile(null)
  }

  const openEdit = (item) => {
    setEditing(item)
    setEditForm({
      judul_dokumen: item.judul_dokumen || '',
      jenis_dokumen: item.jenis_dokumen || 'undangan',
      tanggal_dokumen: item.tanggal_dokumen || '',
      mitra_id: item.mitra_id || '',
      keterangan: item.keterangan || '',
    })
    setShowEdit(true)
  }

  const closeEdit = () => {
    setShowEdit(false)
    setEditing(null)
  }

  const validatePdf = (file) => {
    if (!file) return 'File PDF wajib diisi'

    const nameOk = String(file.name || '').toLowerCase().endsWith('.pdf')
    const type = String(file.type || '').toLowerCase()
    const typeOk = !type || type === 'application/pdf' || type.includes('pdf')
    // Be tolerant: some browsers/proxies set non-standard PDF mime types.
    if (!nameOk && !typeOk) return 'Hanya file PDF yang diperbolehkan'

    if (file.size > MAX_FILE_BYTES) {
      return 'Ukuran file terlalu besar (maks 5MB)'
    }

    return null
  }

  const uploadPdfToStorage = async (file, { judul, jenis, tanggal }) => {
    const basePath = buildStoragePath({
      judul,
      jenis,
      tanggal,
      originalName: file.name,
    })

    // Attempt deterministic path; if conflict, append timestamp
    const attemptUpload = async (path) => {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file, {
          contentType: 'application/pdf',
          upsert: false,
        })
      return { data, error, path }
    }

    let { error, path } = await attemptUpload(basePath)

    const msg = String(error?.message || '').toLowerCase()
    const conflict = error && (error.statusCode === 409 || msg.includes('already exists') || msg.includes('resource already exists'))

    if (conflict) {
      const withTs = basePath.replace(/\.pdf$/i, `-${Date.now()}.pdf`)
      const retry = await attemptUpload(withTs)
      error = retry.error
      path = retry.path
    }

    if (error) throw error
    return path
  }

  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!currentUser || !canUpload || saving) return

    const validationMessage = validatePdf(uploadFile)
    if (validationMessage) {
      toast.error(validationMessage, 'Validasi')
      return
    }

    setSaving(true)
    let storagePath = null

    try {
      storagePath = await uploadPdfToStorage(uploadFile, {
        judul: uploadForm.judul_dokumen,
        jenis: uploadForm.jenis_dokumen,
        tanggal: uploadForm.tanggal_dokumen,
      })

      const { error } = await insertData(
        'arsip_dokumen_humas',
        {
          judul_dokumen: uploadForm.judul_dokumen,
          jenis_dokumen: uploadForm.jenis_dokumen,
          tanggal_dokumen: uploadForm.tanggal_dokumen,
          mitra_id: uploadForm.mitra_id || null,
          file_path: storagePath,
          keterangan: uploadForm.keterangan || null,
          created_by: currentUser.id,
          is_active: true,
        },
        currentUser.id
      )

      if (error) {
        // Best-effort cleanup: remove uploaded file if DB insert fails
        try {
          await supabase.storage.from(BUCKET_NAME).remove([storagePath])
        } catch {
          // ignore
        }
        toast.error('Gagal menyimpan metadata dokumen')
        return
      }

      toast.success('Dokumen berhasil diupload')
      closeUpload()
      await loadArsip()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(getStorageErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!currentUser || !canEdit || saving || !editing?.id) return

    setSaving(true)
    try {
      const { error } = await updateData(
        'arsip_dokumen_humas',
        editing.id,
        {
          judul_dokumen: editForm.judul_dokumen,
          jenis_dokumen: editForm.jenis_dokumen,
          tanggal_dokumen: editForm.tanggal_dokumen,
          mitra_id: editForm.mitra_id || null,
          keterangan: editForm.keterangan || null,
        },
        currentUser.id
      )

      if (error) {
        toast.error('Gagal mengupdate metadata')
        return
      }

      toast.success('Metadata berhasil diupdate')
      closeEdit()
      await loadArsip()
    } catch (error) {
      console.error('Edit error:', error)
      toast.error('Terjadi kesalahan saat update')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async (item) => {
    if (!canDownload) return
    if (!item?.file_path) {
      toast.error('File tidak ditemukan')
      return
    }

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(item.file_path, 60)

      if (error || !data?.signedUrl) {
        toast.error(error ? getStorageErrorMessage(error) : 'Gagal membuat link download')
        return
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Download error:', error)
      toast.error(getStorageErrorMessage(error))
    }
  }

  const handleDelete = async (item) => {
    if (!currentUser || !canDelete || saving || !item?.id) return

    const ok = await confirm({
      title: 'Konfirmasi',
      message: 'Pindahkan dokumen ini ke Sampah?',
      confirmText: 'Ya',
      cancelText: 'Batal',
      danger: true,
    })
    if (!ok) return

    setSaving(true)
    try {
      const { error } = await deactivateData('arsip_dokumen_humas', item.id, currentUser.id)
      if (error) {
        toast.error('Gagal menghapus dokumen')
        return
      }

      toast.success('Dokumen dipindahkan ke Sampah')
      await loadArsip()
      await loadTrashCount()
      if (showTrash) {
        await loadTrash()
      }
    } catch (e) {
      console.error('Delete error:', e)
      toast.error(getStorageErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (item) => {
    if (!currentUser || !canDelete || saving || !item?.id) return

    setSaving(true)
    try {
      const { error } = await updateData(
        'arsip_dokumen_humas',
        item.id,
        { is_active: true },
        currentUser.id
      )

      if (error) {
        toast.error('Gagal memulihkan dokumen')
        return
      }

      toast.success('Dokumen dipulihkan')
      await loadArsip()
      await loadTrashCount()
      await loadTrash()
    } catch (e) {
      console.error('Restore error:', e)
      toast.error('Terjadi kesalahan saat memulihkan')
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
              <h1 className="text-3xl font-bold text-primary">Arsip Surat &amp; Dokumen HUMAS</h1>
              <p className="mt-2 text-secondary">Upload PDF dan kelola metadata arsip internal</p>
            </div>
            <div className="flex items-center gap-3">
              {canManageTrash && (
                <button
                  type="button"
                  className="bg-white rounded-lg shadow w-11 h-11 inline-flex items-center justify-center relative border border-gray-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={async () => {
                    const next = !showTrash
                    setShowTrash(next)
                    if (next) await loadTrash()
                  }}
                  title="Sampah"
                  aria-label="Sampah"
                >
                  <span className="text-red-700">
                    <TrashIcon className="w-5 h-5" />
                  </span>
                  {trashCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                      {trashCount}
                    </span>
                  )}
                </button>
              )}

              {canUpload && (
                <button onClick={openUpload} className="btn-primary">
                  Upload Dokumen
                </button>
              )}
            </div>
          </div>

          {showUpload && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-primary">Upload Dokumen (PDF)</h2>

                <form onSubmit={handleUploadSubmit} className="space-y-4">
                  <div>
                    <label className="form-label">Judul Dokumen</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={uploadForm.judul_dokumen}
                      onChange={(e) => setUploadForm({ ...uploadForm, judul_dokumen: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Jenis Dokumen</label>
                    <select
                      className="form-input"
                      required
                      value={uploadForm.jenis_dokumen}
                      onChange={(e) => setUploadForm({ ...uploadForm, jenis_dokumen: e.target.value })}
                    >
                      {JENIS_DOKUMEN.map((j) => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Tanggal Dokumen</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={uploadForm.tanggal_dokumen}
                      onChange={(e) => setUploadForm({ ...uploadForm, tanggal_dokumen: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Mitra (opsional)</label>
                    <select
                      className="form-input"
                      value={uploadForm.mitra_id}
                      onChange={(e) => setUploadForm({ ...uploadForm, mitra_id: e.target.value })}
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
                    <label className="form-label">File PDF</label>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      required
                      className="form-input"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-secondary mt-1">Maks 5MB. Format: PDF.</p>
                  </div>

                  <div>
                    <label className="form-label">Keterangan (opsional)</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={uploadForm.keterangan}
                      onChange={(e) => setUploadForm({ ...uploadForm, keterangan: e.target.value })}
                      placeholder="Keterangan singkat"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button type="submit" className="btn-primary flex-1" disabled={saving}>
                      {saving ? 'Mengupload...' : 'Upload'}
                    </button>
                    <button type="button" onClick={closeUpload} className="btn-secondary flex-1" disabled={saving}>
                      Batal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showEdit && editing && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-primary">Edit Metadata</h2>

                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label className="form-label">Judul Dokumen</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={editForm.judul_dokumen}
                      onChange={(e) => setEditForm({ ...editForm, judul_dokumen: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Jenis Dokumen</label>
                    <select
                      className="form-input"
                      required
                      value={editForm.jenis_dokumen}
                      onChange={(e) => setEditForm({ ...editForm, jenis_dokumen: e.target.value })}
                    >
                      {JENIS_DOKUMEN.map((j) => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Tanggal Dokumen</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={editForm.tanggal_dokumen}
                      onChange={(e) => setEditForm({ ...editForm, tanggal_dokumen: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Mitra (opsional)</label>
                    <select
                      className="form-input"
                      value={editForm.mitra_id}
                      onChange={(e) => setEditForm({ ...editForm, mitra_id: e.target.value })}
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
                    <label className="form-label">Keterangan (opsional)</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={editForm.keterangan}
                      onChange={(e) => setEditForm({ ...editForm, keterangan: e.target.value })}
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button type="submit" className="btn-primary flex-1" disabled={saving}>
                      {saving ? 'Menyimpan...' : 'Update'}
                    </button>
                    <button type="button" onClick={closeEdit} className="btn-secondary flex-1" disabled={saving}>
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
                    <th>Judul Dokumen</th>
                    <th>Jenis Dokumen</th>
                    <th>Tanggal Dokumen</th>
                    <th>Mitra</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {arsip.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-secondary">
                        Belum ada dokumen
                      </td>
                    </tr>
                  ) : (
                    arsip.map((item) => (
                      <tr key={item.id}>
                        <td className="font-medium">
                          {item.judul_dokumen}
                          {item.keterangan && (
                            <div className="text-xs text-secondary">{item.keterangan}</div>
                          )}
                        </td>
                        <td className="capitalize">{item.jenis_dokumen}</td>
                        <td>{formatTanggal(item.tanggal_dokumen)}</td>
                        <td>{item.mitra_id ? mitraById.get(item.mitra_id) || '—' : '—'}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            {canDownload && (
                              <button
                                type="button"
                                className="text-primary hover:text-primary/80 text-sm"
                                onClick={() => handleDownload(item)}
                                title="Download PDF"
                              >
                                Download
                              </button>
                            )}
                            {canEdit && (
                              <button
                                type="button"
                                className="text-secondary hover:text-primary text-sm"
                                onClick={() => openEdit(item)}
                                title="Edit metadata"
                              >
                                Edit
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className="inline-flex items-center justify-center w-9 h-9 rounded hover:text-red-700 text-red-600"
                                onClick={() => handleDelete(item)}
                                title="Hapus dokumen"
                                disabled={saving}
                              >
                                <span className="sr-only">Hapus</span>
                                <TrashIcon className="w-5 h-5" />
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

          {canManageTrash && showTrash && (
            <div className="bg-white rounded-lg shadow mt-8 w-full max-w-3xl">
              <div className="px-5 py-4 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-red-600">
                    <TrashIcon className="w-4 h-4" />
                  </span>
                  <h2 className="text-lg font-bold text-primary">Sampah</h2>
                </div>
                <p className="text-sm text-secondary mt-1">Dokumen yang dihapus akan muncul di sini.</p>
              </div>
              <div className="h-80 overflow-auto">
                <div className="table-container">
                  <table className="table">
                    <thead className="table-header">
                      <tr>
                        <th>Judul Dokumen</th>
                        <th>Jenis Dokumen</th>
                        <th>Tanggal Dokumen</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {trash.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-6 text-secondary">
                            Sampah masih kosong
                          </td>
                        </tr>
                      ) : (
                        trash.map((item) => (
                          <tr key={item.id}>
                            <td className="font-medium">{item.judul_dokumen}</td>
                            <td className="capitalize">{item.jenis_dokumen}</td>
                            <td>{formatTanggal(item.tanggal_dokumen)}</td>
                            <td>
                              <button
                                type="button"
                                className="text-primary hover:text-primary/80 text-sm"
                                onClick={() => handleRestore(item)}
                                disabled={saving}
                                title="Pulihkan dokumen"
                              >
                                Pulihkan
                              </button>
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
        </div>
      </div>
    </ProtectedRoute>
  )
}

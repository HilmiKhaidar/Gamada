'use client'

import { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import ProtectedRoute from '../../components/ProtectedRoute'
import { 
  fetchData, 
  insertData, 
  updateData, 
  deactivateData, 
  getCurrentUser 
} from '../../lib/supabaseClient'

export default function MitraPage() {
  const [mitra, setMitra] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [formData, setFormData] = useState({
    nama_lembaga: '',
    kontak: '',
    keterangan: ''
  })

  useEffect(() => {
    loadData()
    loadCurrentUser()
  }, [])

  const loadCurrentUser = async () => {
    const user = await getCurrentUser()
    setCurrentUser(user)
  }

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await fetchData('mitra', { is_active: true })
    if (!error && data) {
      setMitra(data)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!currentUser) return

    try {
      if (editingId) {
        const { error } = await updateData('mitra', editingId, formData, currentUser.id)
        if (!error) {
          alert('Data berhasil diupdate')
        }
      } else {
        const { error } = await insertData('mitra', formData, currentUser.id)
        if (!error) {
          alert('Data berhasil ditambahkan')
        }
      }
      
      resetForm()
      loadData()
    } catch (error) {
      console.error('Error saving data:', error)
      alert('Terjadi kesalahan saat menyimpan data')
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
    
    if (confirm('Yakin ingin menonaktifkan data ini?')) {
      const { error } = await deactivateData('mitra', id, currentUser.id)
      if (!error) {
        alert('Data berhasil dinonaktifkan')
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Data Mitra</h1>
              <p className="mt-2 text-gray-600">Kelola data mitra kerjasama HUMAS GAMADA</p>
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
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeactivate(item.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
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
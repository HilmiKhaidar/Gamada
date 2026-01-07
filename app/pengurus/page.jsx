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

export default function PengurusPage() {
  const [pengurus, setPengurus] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [formData, setFormData] = useState({
    nama: '',
    jabatan: '',
    kontak: '',
    periode: ''
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
    const { data, error } = await fetchData('pengurus_humas', { is_active: true })
    if (!error && data) {
      setPengurus(data)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!currentUser) return

    try {
      if (editingId) {
        // Update existing
        const { error } = await updateData('pengurus_humas', editingId, formData, currentUser.id)
        if (!error) {
          alert('Data berhasil diupdate')
        }
      } else {
        // Insert new
        const { error } = await insertData('pengurus_humas', formData, currentUser.id)
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
      nama: item.nama,
      jabatan: item.jabatan,
      kontak: item.kontak,
      periode: item.periode
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDeactivate = async (id) => {
    if (!currentUser) return
    
    if (confirm('Yakin ingin menonaktifkan data ini?')) {
      const { error } = await deactivateData('pengurus_humas', id, currentUser.id)
      if (!error) {
        alert('Data berhasil dinonaktifkan')
        loadData()
      }
    }
  }

  const resetForm = () => {
    setFormData({
      nama: '',
      jabatan: '',
      kontak: '',
      periode: ''
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
              <h1 className="text-3xl font-bold text-gray-900">Data Pengurus HUMAS</h1>
              <p className="mt-2 text-gray-600">Kelola data pengurus bidang HUMAS</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              Tambah Pengurus
            </button>
          </div>

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">
                  {editingId ? 'Edit Pengurus' : 'Tambah Pengurus'}
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
                    <label className="form-label">Jabatan</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={formData.jabatan}
                      onChange={(e) => setFormData({...formData, jabatan: e.target.value})}
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
                    <label className="form-label">Periode</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={formData.periode}
                      onChange={(e) => setFormData({...formData, periode: e.target.value})}
                      placeholder="Contoh: 2024-2025"
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
                    <th>Nama</th>
                    <th>Jabatan</th>
                    <th>Kontak</th>
                    <th>Periode</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {pengurus.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-gray-500">
                        Belum ada data pengurus
                      </td>
                    </tr>
                  ) : (
                    pengurus.map((item) => (
                      <tr key={item.id}>
                        <td className="font-medium">{item.nama}</td>
                        <td>{item.jabatan}</td>
                        <td>{item.kontak}</td>
                        <td>{item.periode}</td>
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
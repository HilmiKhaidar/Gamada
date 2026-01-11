'use client'

import Navbar from '../../components/Navbar'
import ProtectedRoute from '../../components/ProtectedRoute'

export default function PanduanPenggunaanPage() {
  return (
    <ProtectedRoute>
      <Navbar />
      <div className="min-h-screen bg-pagebg">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary">Panduan Penggunaan</h1>
            <p className="mt-2 text-secondary">Ringkasan cara menggunakan aplikasi internal HUMAS</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900">Login</h2>
              <ol className="mt-2 list-decimal list-inside text-sm text-secondary space-y-1">
                <li>Masuk menggunakan akun yang dibuat oleh admin.</li>
                <li>Setelah login, kamu akan diarahkan ke Dashboard.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">Menu Utama</h2>
              <ul className="mt-2 list-disc list-inside text-sm text-secondary space-y-1">
                <li>
                  <span className="font-medium text-gray-900">Pengurus / Pembina / Mitra</span>: kelola data dan status aktif/nonaktif.
                </li>
                <li>
                  <span className="font-medium text-gray-900">Agenda</span>: tambah/edit agenda dan update status (sesuai role).
                </li>
                <li>
                  <span className="font-medium text-gray-900">Arsip Dokumen</span>: upload PDF + download; edit metadata (sesuai role).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">Catatan Akses</h2>
              <p className="mt-2 text-sm text-secondary">
                Tombol dan aksi tertentu ditampilkan berdasarkan role (ketua/sekretaris/staff).
                Semua akses data juga dibatasi oleh kebijakan RLS di database.
              </p>
            </section>

            <div className="pt-2">
              <a href="/dashboard" className="btn-primary inline-block">
                Kembali ke Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

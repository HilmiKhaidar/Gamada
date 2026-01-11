'use client'

import { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardMiniCalendar from '../../components/DashboardMiniCalendar'
import { fetchData, getCurrentUser, getUserProfile } from '../../lib/supabaseClient'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    pengurus: 0,
    pembina: 0,
    mitra: 0
  })
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load user profile
      const user = await getCurrentUser()
      if (user) {
        const { data: userProfile } = await getUserProfile(user.id)
        setProfile(userProfile)
      }

      // Load statistics
      const [pengurusData, pembinaData, mitraData] = await Promise.all([
        fetchData('pengurus_humas', { is_active: true }),
        fetchData('pembina', { is_active: true }),
        fetchData('mitra', { is_active: true })
      ])

      setStats({
        pengurus: pengurusData.data?.length || 0,
        pembina: pembinaData.data?.length || 0,
        mitra: mitraData.data?.length || 0
      })
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
            <p className="mt-2 text-secondary">
              Selamat datang, {profile?.nama}
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary">Total Pengurus</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pengurus}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary">Total Pembina</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pembina}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary">Total Mitra</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.mitra}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Menu Utama</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="/pengurus"
                  className="block p-4 border border-gray-200 rounded-lg hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <h3 className="font-medium text-primary">Kelola Pengurus</h3>
                  <p className="mt-1 text-sm text-secondary">
                    Tambah, edit, dan kelola data pengurus HUMAS
                  </p>
                </a>

                <a
                  href="/pembina"
                  className="block p-4 border border-gray-200 rounded-lg hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <h3 className="font-medium text-primary">Kelola Pembina</h3>
                  <p className="mt-1 text-sm text-secondary">
                    Tambah, edit, dan kelola data pembina
                  </p>
                </a>

                <a
                  href="/mitra"
                  className="block p-4 border border-gray-200 rounded-lg hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <h3 className="font-medium text-primary">Kelola Mitra</h3>
                  <p className="mt-1 text-sm text-secondary">
                    Tambah, edit, dan kelola data mitra kerjasama
                  </p>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <DashboardMiniCalendar />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile } from '../lib/supabaseClient'

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await getUserProfile(user.id)
      
      if (!profile) {
        router.push('/login')
        return
      }

      // Jika allowedRoles kosong, berarti semua role HUMAS diizinkan
      if (allowedRoles.length === 0) {
        const validRoles = ['ketua_humas', 'sekretaris_humas', 'staff_humas']
        if (validRoles.includes(profile.role)) {
          setAuthorized(true)
        } else {
          router.push('/login')
        }
      } else {
        // Cek role spesifik
        if (allowedRoles.includes(profile.role)) {
          setAuthorized(true)
        } else {
          router.push('/dashboard') // Redirect ke dashboard jika tidak ada akses
        }
      }
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return children
}
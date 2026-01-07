'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '../lib/supabaseClient'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    checkUserAndRedirect()
  }, [router])

  const checkUserAndRedirect = async () => {
    try {
      const user = await getCurrentUser()
      if (user) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Memuat...</p>
      </div>
    </div>
  )
}
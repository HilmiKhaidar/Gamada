'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, signOut, getCurrentUser, getUserProfile } from '../lib/supabaseClient'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const router = useRouter()

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const currentUser = await getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
      const { data: userProfile } = await getUserProfile(currentUser.id)
      setProfile(userProfile)
    }
  }

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (!error) {
      router.push('/login')
    }
  }

  return (
    <nav className="bg-green-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">HUMAS GAMADA</h1>
          <span className="text-sm opacity-75">Daarut Tauhid Bandung</span>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="hidden md:flex space-x-4">
            <a href="/dashboard" className="hover:text-green-200 transition-colors">
              Dashboard
            </a>
            <a href="/pengurus" className="hover:text-green-200 transition-colors">
              Pengurus
            </a>
            <a href="/pembina" className="hover:text-green-200 transition-colors">
              Pembina
            </a>
            <a href="/mitra" className="hover:text-green-200 transition-colors">
              Mitra
            </a>
          </div>
          
          {profile && (
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium">{profile.nama}</div>
                <div className="text-xs opacity-75 capitalize">
                  {profile.role.replace('_', ' ')}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-green-700 hover:bg-green-800 px-3 py-1 rounded text-sm transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
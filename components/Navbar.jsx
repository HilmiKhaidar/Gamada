'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase, signOut, getCurrentUser, getUserProfile } from '../lib/supabaseClient'
import logoMasjidDT from '../Assets/LogoDarut.png'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const navItems = useMemo(
    () => [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/pengurus', label: 'Pengurus' },
      { href: '/pembina', label: 'Pembina' },
      { href: '/mitra', label: 'Mitra' },
      { href: '/agenda', label: 'Agenda' },
      { href: '/arsip-dokumen', label: 'Arsip Dokumen' },
      { href: '/panduan-penggunaan', label: 'Panduan' },
    ],
    []
  )

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    // Close mobile menu on route change
    setMobileOpen(false)
  }, [pathname])

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

  const linkClass = (href) => {
    const isActive = pathname === href
    return [
      'px-2 py-2 text-sm transition-colors',
      isActive ? 'text-white border-b-2 border-white' : 'text-white/80 hover:text-white',
    ].join(' ')
  }

  return (
    <nav className="bg-primary text-white border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src={logoMasjidDT}
              alt="Logo Masjid Daarut Tauhid"
              className="h-10 w-auto"
              priority
            />
            <div className="leading-tight">
              <div className="text-lg font-bold">Hubungan Masyarakat GAMADA</div>
              <div className="text-sm text-white/80">Daarut Tauhid Bandung</div>
            </div>
          </Link>

          {/* Desktop menu */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden bg-white/10 hover:bg-white/20 px-3 py-2 rounded transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Buka menu"
              aria-expanded={mobileOpen}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {profile && (
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium">{profile.nama}</div>
                  <div className="text-xs text-white/80 capitalize">{profile.role.replace('_', ' ')}</div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded text-sm transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileOpen && (
          <div className="lg:hidden pb-4 border-t border-white/10">
            <div className="pt-3 flex flex-col">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    'px-2 py-2 rounded text-sm transition-colors ' +
                    (pathname === item.href ? 'bg-white/15 text-white' : 'text-white/80 hover:text-white hover:bg-white/10')
                  }
                >
                  {item.label}
                </Link>
              ))}

              {profile && (
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{profile.nama}</div>
                    <div className="text-xs text-white/80 capitalize">{profile.role.replace('_', ' ')}</div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded text-sm transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
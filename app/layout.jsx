import './globals.css'

export const metadata = {
  title: 'HUMAS GAMADA - Daarut Tauhid Bandung',
  description: 'Aplikasi Internal Bidang Hubungan Masyarakat GAMADA',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        {children}
      </body>
    </html>
  )
}
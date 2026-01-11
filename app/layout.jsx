import './globals.css'
import Footer from '../components/Footer'
import ClientProviders from '../components/ClientProviders'

export const metadata = {
  title: 'HUMAS GAMADA – Daarut Tauhid Bandung',
  description: 'Aplikasi Internal Bidang Hubungan Masyarakat GAMADA',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/assets/favicon.png" type="image/png" />
      </head>
      <body className="bg-pagebg min-h-screen flex flex-col">
        <ClientProviders>
          <main className="flex-1">{children}</main>
        </ClientProviders>
        <Footer />
      </body>
    </html>
  )
}
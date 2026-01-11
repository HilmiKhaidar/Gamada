export default function Footer() {
  return (
    <footer className="bg-primary text-white border-t border-white/10">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <h3 className="text-lg font-bold text-pagebg">HUMAS GAMADA</h3>
            <p className="mt-1 text-sm text-white/80">Masjid Daarut Tauhid Bandung</p>
            <p className="mt-4 text-sm text-white/80 leading-relaxed">
              Sistem internal untuk pengelolaan administrasi Bidang Hubungan Masyarakat: data pengurus, pembina, mitra,
              agenda kegiatan, serta arsip surat &amp; dokumen.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-pagebg">Info</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a className="text-white/80 hover:text-white transition-colors" href="/panduan-penggunaan">
                  Panduan Penggunaan
                </a>
              </li>
              <li>
                <a className="text-white/80 hover:text-white transition-colors" href="/agenda">
                  Agenda Kegiatan
                </a>
              </li>
              <li>
                <a className="text-white/80 hover:text-white transition-colors" href="/arsip-dokumen">
                  Arsip Dokumen
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-pagebg">Kontak</h3>
            <div className="mt-4 space-y-2 text-sm text-white/80">
              <div>Masjid Daarut Tauhid Bandung</div>
              <div>Daarut Tauhid Mosque, Jalan Gegerkalong Girang 30 40153 Isola Jawa Barat</div>
              <div>Email HUMAS: -</div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-4 text-center">
          <div className="text-sm text-white/90">
            © 2026 HUMAS GAMADA – Masjid Daarut Tauhid Bandung
          </div>
          <div className="text-sm text-white/80">Aplikasi Internal Bidang Hubungan Masyarakat</div>
        </div>
      </div>
    </footer>
  )
}

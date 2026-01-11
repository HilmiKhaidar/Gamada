# HUMAS GAMADA - Aplikasi Web Internal

Aplikasi web internal untuk Bidang Hubungan Masyarakat (HUMAS) GAMADA, organisasi masjid Daarut Tauhid Bandung.

## 🚀 Technology Stack

- **Frontend**: Next.js 14 (App Router)
- **Language**: JavaScript
- **Backend**: Supabase
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (recommended)

## 📁 Project Structure

```
humas-gamada-app/
├── app/
│   ├── globals.css
│   ├── layout.jsx
│   ├── login/
│   │   └── page.jsx
│   ├── dashboard/
│   │   └── page.jsx
│   ├── pengurus/
│   │   └── page.jsx
│   ├── pembina/
│   │   └── page.jsx
│   └── mitra/
│       └── page.jsx
├── components/
│   ├── Navbar.jsx
│   └── ProtectedRoute.jsx
├── lib/
│   └── supabaseClient.js
├── middleware.js
├── supabase-schema.sql
├── package.json
└── README.md
```

## 🔐 Authentication & Authorization

### User Roles
- **ketua_humas**: Full access (CRUD + Deactivate)
- **sekretaris_humas**: Insert & Update only
- **staff_humas**: Insert & Update only

### Access Control
- Middleware melindungi semua route kecuali `/login`
- User harus login untuk mengakses aplikasi
- Role-based access control untuk operasi data

## 🗄️ Database Schema

### Tables
1. **profiles** - Data user dan role
2. **pengurus_humas** - Data pengurus HUMAS
3. **pembina** - Data pembina
4. **mitra** - Data mitra kerjasama
5. **histori_update** - Log semua perubahan data

### Row Level Security (RLS)
- Semua tabel menggunakan RLS
- Policy berdasarkan role user
- Tidak ada DELETE permanen (soft delete dengan `is_active`)

## 🛠️ Setup & Installation

### 1. Install Dependencies
Karena project sudah ada di folder ini, langsung install dependencies:
```bash
npm install
```

**Catatan**: Jika ingin menyimpan ke Git repository nanti:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repository-url>
git push -u origin main
```

### 2. Setup Supabase
1. Buat project baru di [Supabase](https://supabase.com)
2. Jalankan SQL schema dari file `supabase-schema.sql`
3. Copy environment variables

### 3. Environment Variables
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_ARSIP_BUCKET=arsip-dokumen
```

### 4. Setup Supabase Storage (untuk Arsip Dokumen)
Fitur upload/download PDF di menu **Arsip Dokumen** menggunakan Supabase Storage.

1. Buat bucket di Supabase Dashboard: **Storage -> Buckets -> New bucket**
2. Nama bucket harus sama dengan yang dipakai aplikasi.
	- Default: `arsip-dokumen`
	 - Atau ubah lewat env: `NEXT_PUBLIC_SUPABASE_ARSIP_BUCKET`

> Jika bucket belum dibuat, upload akan error: **"Bucket not found"**.

#### (Opsional tapi biasanya wajib) Storage Policies
Jika bucket sudah ada tapi upload/download masih ditolak (403 / RLS), tambahkan policy untuk `storage.objects`.

Contoh (sesuaikan jika bucket-name berbeda):
```sql
-- Allow HUMAS roles to upload/read PDF in arsip bucket
create policy "HUMAS can upload arsip dokumen" on storage.objects
for insert to authenticated
with check (
	bucket_id = 'arsip-dokumen'
	and exists (
		select 1 from public.profiles p
		where p.id = auth.uid()
			and p.role in ('ketua_humas','sekretaris_humas','staff_humas')
	)
);

create policy "HUMAS can read arsip dokumen" on storage.objects
for select to authenticated
using (
	bucket_id = 'arsip-dokumen'
	and exists (
		select 1 from public.profiles p
		where p.id = auth.uid()
			and p.role in ('ketua_humas','sekretaris_humas','staff_humas')
	)
);

-- Optional: allow ketua/sekretaris to delete (used for best-effort cleanup on failed DB insert)
create policy "Ketua/Sekretaris can delete arsip dokumen" on storage.objects
for delete to authenticated
using (
	bucket_id = 'arsip-dokumen'
	and exists (
		select 1 from public.profiles p
		where p.id = auth.uid()
			and p.role in ('ketua_humas','sekretaris_humas')
	)
);
```

### 5. Create First User
Di Supabase Dashboard:
1. Go to Authentication > Users
2. Create new user dengan email/password
3. Insert ke table `profiles`:
```sql
INSERT INTO profiles (id, nama, role) VALUES 
('user-uuid-from-auth', 'Admin HUMAS', 'ketua_humas');
```

### 6. Run Development Server
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## 📋 Features

### Dashboard
- Statistik jumlah pengurus, pembina, dan mitra
- Quick access ke semua menu
- User profile display

### Data Management
- **Pengurus HUMAS**: Kelola data pengurus dengan jabatan dan periode
- **Pembina**: Kelola data pembina dengan peran dan keterangan
- **Mitra**: Kelola data mitra kerjasama

### CRUD Operations
- Create: Tambah data baru
- Read: Tampilkan data dalam tabel
- Update: Edit data existing
- Deactivate: Soft delete (set `is_active = false`)

### Audit Trail
- Semua perubahan data tercatat di `histori_update`
- Tracking user, action, dan timestamp

## 🔧 Key Components

### `lib/supabaseClient.js`
- Konfigurasi Supabase client
- Helper functions untuk auth dan CRUD
- Automatic logging ke histori_update

### `middleware.js`
- Route protection
- Role-based access control
- Automatic redirects

### `components/ProtectedRoute.jsx`
- Component wrapper untuk protected pages
- Loading states
- Authorization checks

### `components/Navbar.jsx`
- Navigation menu
- User profile display
- Logout functionality

## 🚀 Deployment

### Vercel (Recommended)
1. Push code ke GitHub
2. Connect repository di Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production
```
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
```

## 📝 Usage Guide

### Login
1. Akses aplikasi di browser
2. Masukkan email dan password
3. Akan redirect ke dashboard setelah login berhasil

### Mengelola Data
1. Pilih menu (Pengurus/Pembina/Mitra)
2. Klik "Tambah" untuk data baru
3. Klik "Edit" untuk mengubah data
4. Klik "Nonaktifkan" untuk soft delete

### Role Permissions
- **Ketua HUMAS**: Bisa semua operasi
- **Sekretaris/Staff**: Hanya bisa tambah dan edit

## 🔍 Code Quality

### Best Practices
- Separation of concerns (lib, components, pages)
- Reusable components
- Error handling
- Loading states
- Responsive design

### Security
- Row Level Security (RLS)
- Protected routes
- Input validation
- SQL injection prevention

## 🐛 Troubleshooting

### Common Issues
1. **Login gagal**: Cek credentials dan RLS policies
2. **Data tidak muncul**: Cek RLS policies dan user role
3. **CRUD error**: Cek permissions dan database connection

### Debug Tips
- Check browser console untuk errors
- Verify Supabase connection
- Check user role di database
- Verify RLS policies

## 📞 Support

Untuk bantuan teknis atau pertanyaan, hubungi tim developer atau admin sistem.

---

**HUMAS GAMADA - Daarut Tauhid Bandung**  
*Aplikasi Internal Bidang Hubungan Masyarakat*
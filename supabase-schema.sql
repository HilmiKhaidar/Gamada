-- =============================================
-- SUPABASE DATABASE SCHEMA - CLEAN VERSION
-- Aplikasi HUMAS GAMADA - Daarut Tauhid Bandung
-- =============================================

-- 1. Table: profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nama TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ketua_humas', 'sekretaris_humas', 'staff_humas')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table: pengurus_humas
CREATE TABLE pengurus_humas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  jabatan TEXT NOT NULL,
  kontak TEXT NOT NULL,
  periode TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table: pembina
CREATE TABLE pembina (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  peran TEXT NOT NULL,
  kontak TEXT NOT NULL,
  keterangan TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table: mitra
CREATE TABLE mitra (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_lembaga TEXT NOT NULL,
  kontak TEXT NOT NULL,
  keterangan TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table: histori_update
CREATE TABLE histori_update (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DEACTIVATE')),
  record_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengurus_humas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembina ENABLE ROW LEVEL SECURITY;
ALTER TABLE mitra ENABLE ROW LEVEL SECURITY;
ALTER TABLE histori_update ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLICIES FOR PROFILES TABLE
-- =============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- POLICIES FOR PENGURUS_HUMAS TABLE
-- =============================================

-- All HUMAS roles can SELECT
CREATE POLICY "HUMAS can read pengurus" ON pengurus_humas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('ketua_humas', 'sekretaris_humas', 'staff_humas')
    )
  );

-- Ketua HUMAS can INSERT, UPDATE, DEACTIVATE
CREATE POLICY "Ketua can manage pengurus" ON pengurus_humas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'ketua_humas'
    )
  );

-- Sekretaris and Staff can INSERT and UPDATE
CREATE POLICY "Sekretaris and Staff can insert pengurus" ON pengurus_humas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('sekretaris_humas', 'staff_humas')
    )
  );

CREATE POLICY "Sekretaris and Staff can update pengurus" ON pengurus_humas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('sekretaris_humas', 'staff_humas')
    )
  );

-- =============================================
-- POLICIES FOR PEMBINA TABLE
-- =============================================

-- All HUMAS roles can SELECT
CREATE POLICY "HUMAS can read pembina" ON pembina
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('ketua_humas', 'sekretaris_humas', 'staff_humas')
    )
  );

-- Ketua HUMAS can INSERT, UPDATE, DEACTIVATE
CREATE POLICY "Ketua can manage pembina" ON pembina
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'ketua_humas'
    )
  );

-- Sekretaris and Staff can INSERT and UPDATE
CREATE POLICY "Sekretaris and Staff can insert pembina" ON pembina
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('sekretaris_humas', 'staff_humas')
    )
  );

CREATE POLICY "Sekretaris and Staff can update pembina" ON pembina
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('sekretaris_humas', 'staff_humas')
    )
  );

-- =============================================
-- POLICIES FOR MITRA TABLE
-- =============================================

-- All HUMAS roles can SELECT
CREATE POLICY "HUMAS can read mitra" ON mitra
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('ketua_humas', 'sekretaris_humas', 'staff_humas')
    )
  );

-- Ketua HUMAS can INSERT, UPDATE, DEACTIVATE
CREATE POLICY "Ketua can manage mitra" ON mitra
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'ketua_humas'
    )
  );

-- Sekretaris and Staff can INSERT and UPDATE
CREATE POLICY "Sekretaris and Staff can insert mitra" ON mitra
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('sekretaris_humas', 'staff_humas')
    )
  );

CREATE POLICY "Sekretaris and Staff can update mitra" ON mitra
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('sekretaris_humas', 'staff_humas')
    )
  );

-- =============================================
-- POLICIES FOR HISTORI_UPDATE TABLE
-- =============================================

-- All HUMAS roles can read history
CREATE POLICY "HUMAS can read history" ON histori_update
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('ketua_humas', 'sekretaris_humas', 'staff_humas')
    )
  );

-- All HUMAS roles can insert history (for logging)
CREATE POLICY "HUMAS can insert history" ON histori_update
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('ketua_humas', 'sekretaris_humas', 'staff_humas')
    )
  );

-- =============================================
-- INSERT SAMPLE USER PROFILE
-- =============================================

-- Insert your profile (ganti UUID dengan yang benar)
INSERT INTO profiles (id, nama, role) VALUES 
('a936f303-c9e5-4c0e-8b20-1ffc1f3fc553', 'Hilmi Khaidar', 'ketua_humas');
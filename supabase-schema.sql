-- =============================================
-- SUPABASE DATABASE SCHEMA
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
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_pengurus_humas_updated_at 
  BEFORE UPDATE ON pengurus_humas 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pembina_updated_at 
  BEFORE UPDATE ON pembina 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mitra_updated_at 
  BEFORE UPDATE ON mitra 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Insert sample profile (manual via Supabase dashboard)
-- INSERT INTO profiles (id, nama, role) VALUES 
-- ('user-uuid-here', 'Admin HUMAS', 'ketua_humas');

-- Insert sample data
-- INSERT INTO pengurus_humas (nama, jabatan, kontak, periode) VALUES 
-- ('Ahmad Fauzi', 'Ketua HUMAS', '081234567890', '2024-2025'),
-- ('Siti Nurhaliza', 'Sekretaris', '081234567891', '2024-2025');

-- INSERT INTO pembina (nama, peran, kontak, keterangan) VALUES 
-- ('Dr. Abdullah', 'Pembina Utama', '081234567892', 'Ahli Komunikasi'),
-- ('Ustadz Yusuf', 'Pembina Ahli', '081234567893', 'Spesialis Media');

-- INSERT INTO mitra (nama_lembaga, kontak, keterangan) VALUES 
-- ('Radio Dakwah FM', '081234567894', 'Kerjasama siaran dakwah'),
-- ('Yayasan Pendidikan Islam', '081234567895', 'Program edukasi bersama');
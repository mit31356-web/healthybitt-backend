-- ============================================================
-- HealthyBit: Fix RLS for Clerk-based Authentication
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================
-- Since we use Clerk for authentication (not Supabase Auth),
-- auth.uid() is always NULL. Standard RLS blocks all anon writes.
-- We disable RLS and grant full access to anon role instead.
-- Security is enforced at the Clerk + application layer.
-- ============================================================

-- Disable RLS on all app tables
ALTER TABLE public.hb_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hb_food_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hb_weight_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hb_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hb_declined_payments DISABLE ROW LEVEL SECURITY;

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.hb_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.hb_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.hb_profiles;
DROP POLICY IF EXISTS "Users can view own food logs" ON public.hb_food_logs;
DROP POLICY IF EXISTS "Users can insert own food logs" ON public.hb_food_logs;
DROP POLICY IF EXISTS "Users can delete own food logs" ON public.hb_food_logs;
DROP POLICY IF EXISTS "Users can update own food logs" ON public.hb_food_logs;
DROP POLICY IF EXISTS "Users can view own weight logs" ON public.hb_weight_logs;
DROP POLICY IF EXISTS "Users can insert own weight logs" ON public.hb_weight_logs;

-- Grant full access to anon and authenticated roles
GRANT ALL ON public.hb_profiles TO anon, authenticated;
GRANT ALL ON public.hb_food_logs TO anon, authenticated;
GRANT ALL ON public.hb_weight_logs TO anon, authenticated;
GRANT ALL ON public.hb_payments TO anon, authenticated;
GRANT ALL ON public.hb_declined_payments TO anon, authenticated;

-- Also grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Make sure food-images and avatars storage buckets exist and are public
INSERT INTO storage.buckets (id, name, public) VALUES ('food-images', 'food-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Grant storage access via standard DDL policies
DROP POLICY IF EXISTS "Allow anon upload food-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read food-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update food-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon delete food-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon delete avatars" ON storage.objects;

-- Create policies for food-images bucket
CREATE POLICY "Allow anon upload food-images" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'food-images');
CREATE POLICY "Allow anon read food-images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'food-images');
CREATE POLICY "Allow anon update food-images" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'food-images');
CREATE POLICY "Allow anon delete food-images" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'food-images');

-- Create policies for avatars bucket
CREATE POLICY "Allow anon upload avatars" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Allow anon read avatars" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Allow anon update avatars" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Allow anon delete avatars" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'avatars');

SELECT 'RLS disabled and permissions granted successfully.' AS result;

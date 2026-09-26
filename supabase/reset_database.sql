-- ============================================================
-- HealthyBit: Clean Recreate Database Tables & Disable RLS
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Drop existing tables if they exist
DROP TABLE IF EXISTS public.hb_declined_payments CASCADE;
DROP TABLE IF EXISTS public.hb_payments CASCADE;
DROP TABLE IF EXISTS public.hb_weight_logs CASCADE;
DROP TABLE IF EXISTS public.hb_food_logs CASCADE;
DROP TABLE IF EXISTS public.hb_profiles CASCADE;

-- 2. Create hb_profiles table
CREATE TABLE public.hb_profiles (
  id UUID PRIMARY KEY, -- Mapped UUID from Clerk ID
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  daily_calorie_goal INTEGER DEFAULT 2200,
  protein_goal_g INTEGER DEFAULT 130,
  carbs_goal_g INTEGER DEFAULT 220,
  fats_goal_g INTEGER DEFAULT 70,
  weight_kg NUMERIC DEFAULT 75,
  height_cm NUMERIC DEFAULT 175,
  target_weight_kg NUMERIC DEFAULT 70,
  activity_level TEXT DEFAULT 'moderate',
  goal_type TEXT DEFAULT 'lose',
  avatar_url TEXT,
  phone TEXT,
  is_premium BOOLEAN DEFAULT false,
  scans_used INTEGER DEFAULT 0,
  premium_until TIMESTAMPTZ,
  current_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create hb_food_logs table
CREATE TABLE public.hb_food_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL, -- references hb_profiles(id)
  food_name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein_g INTEGER NOT NULL,
  carbs_g INTEGER NOT NULL,
  fats_g INTEGER NOT NULL,
  image_url TEXT,
  ingredients TEXT,
  health_score INTEGER,
  logged_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create hb_weight_logs table
CREATE TABLE public.hb_weight_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL, -- references hb_profiles(id)
  weight_kg NUMERIC NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create hb_payments table
CREATE TABLE public.hb_payments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  cashfree_order_id TEXT NOT NULL UNIQUE,
  cashfree_payment_id TEXT,
  plan TEXT NOT NULL,
  amount_inr INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'success', 'pending', 'failed'
  premium_from TIMESTAMPTZ,
  premium_until TIMESTAMPTZ,
  user_email TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create hb_declined_payments table
CREATE TABLE public.hb_declined_payments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  cashfree_order_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL,
  amount_inr INTEGER NOT NULL,
  error_code TEXT,
  error_description TEXT,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Disable Row Level Security (RLS) on all tables for Clerk authentication
ALTER TABLE public.hb_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hb_food_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hb_weight_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hb_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hb_declined_payments DISABLE ROW LEVEL SECURITY;

-- 8. Grant full permissions to anonymous and authenticated users
GRANT ALL ON public.hb_profiles TO anon, authenticated;
GRANT ALL ON public.hb_food_logs TO anon, authenticated;
GRANT ALL ON public.hb_weight_logs TO anon, authenticated;
GRANT ALL ON public.hb_payments TO anon, authenticated;
GRANT ALL ON public.hb_declined_payments TO anon, authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 9. Initialize storage buckets and make them public
INSERT INTO storage.buckets (id, name, public) VALUES ('food-images', 'food-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 10. Enable public uploads/downloads/updates to storage buckets via standard policies
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


SELECT 'Database reset and Clerk permissions setup completed successfully.' AS result;

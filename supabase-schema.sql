-- Supabase Schema for E-nergy Flow App
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT 'Engineer',
  decimal_precision INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily data table
CREATE TABLE IF NOT EXISTS daily_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date_key)
);

-- Feeder readings table
CREATE TABLE IF NOT EXISTS feeders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_data_id UUID NOT NULL REFERENCES daily_data(id) ON DELETE CASCADE,
  feeder_name TEXT NOT NULL,
  start_reading TEXT DEFAULT '',
  end_reading TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(daily_data_id, feeder_name)
);

-- Turbine readings table
CREATE TABLE IF NOT EXISTS turbines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_data_id UUID NOT NULL REFERENCES daily_data(id) ON DELETE CASCADE,
  turbine_name TEXT NOT NULL,
  previous_reading TEXT DEFAULT '',
  present_reading TEXT DEFAULT '',
  hours TEXT DEFAULT '24',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(daily_data_id, turbine_name)
);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeders ENABLE ROW LEVEL SECURITY;
ALTER TABLE turbines ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Daily data: Users can only access their own data
CREATE POLICY "Users can view own daily_data" ON daily_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily_data" ON daily_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily_data" ON daily_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily_data" ON daily_data
  FOR DELETE USING (auth.uid() = user_id);

-- Feeders: Users can access feeders through their daily_data
CREATE POLICY "Users can view own feeders" ON feeders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM daily_data 
      WHERE daily_data.id = feeders.daily_data_id 
      AND daily_data.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own feeders" ON feeders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_data 
      WHERE daily_data.id = feeders.daily_data_id 
      AND daily_data.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own feeders" ON feeders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM daily_data 
      WHERE daily_data.id = feeders.daily_data_id 
      AND daily_data.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own feeders" ON feeders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM daily_data 
      WHERE daily_data.id = feeders.daily_data_id 
      AND daily_data.user_id = auth.uid()
    )
  );

-- Turbines: Users can access turbines through their daily_data
CREATE POLICY "Users can view own turbines" ON turbines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM daily_data 
      WHERE daily_data.id = turbines.daily_data_id 
      AND daily_data.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own turbines" ON turbines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_data 
      WHERE daily_data.id = turbines.daily_data_id 
      AND daily_data.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own turbines" ON turbines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM daily_data 
      WHERE daily_data.id = turbines.daily_data_id 
      AND daily_data.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own turbines" ON turbines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM daily_data 
      WHERE daily_data.id = turbines.daily_data_id 
      AND daily_data.user_id = auth.uid()
    )
  );

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Mohammed'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_data_updated_at
  BEFORE UPDATE ON daily_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feeders_updated_at
  BEFORE UPDATE ON feeders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_turbines_updated_at
  BEFORE UPDATE ON turbines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GUEST AUTHENTICATION SUPPORT
-- ============================================================================

-- REQUIRED: To enable anonymous sign-in, go to Supabase Dashboard:
-- Authentication > Providers > Anonymous Sign-In > Enable

-- The RLS policies above already work with anonymous/guest users since they use auth.uid()
-- which returns the user ID for both regular and anonymous users.

-- When a guest upgrades their account by adding email/password credentials,
-- Supabase links the new credentials to the same user_id. This means:
-- 1. No data migration is needed
-- 2. The same user_id continues to work with RLS
-- 3. All existing data remains accessible

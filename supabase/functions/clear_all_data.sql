-- Create a function to clear all data
CREATE OR REPLACE FUNCTION clear_all_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Disable RLS temporarily
  ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
  ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
  ALTER TABLE trip_members DISABLE ROW LEVEL SECURITY;
  ALTER TABLE explore_items DISABLE ROW LEVEL SECURITY;
  ALTER TABLE wishlist_items DISABLE ROW LEVEL SECURITY;
  ALTER TABLE memories DISABLE ROW LEVEL SECURITY;

  -- Clear all data from tables
  TRUNCATE TABLE memories CASCADE;
  TRUNCATE TABLE wishlist_items CASCADE;
  TRUNCATE TABLE explore_items CASCADE;
  TRUNCATE TABLE trip_members CASCADE;
  TRUNCATE TABLE trips CASCADE;
  TRUNCATE TABLE profiles CASCADE;

  -- Clear storage buckets
  DELETE FROM storage.objects WHERE bucket_id = 'memories';
  DELETE FROM storage.objects WHERE bucket_id = 'avatars';

  -- Re-enable RLS
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
  ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
  ALTER TABLE explore_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
END;
$$; 
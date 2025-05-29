-- Create a function to handle profile creation securely
CREATE OR REPLACE FUNCTION create_profile(
  profile_id UUID,
  profile_full_name TEXT,
  profile_avatar_url TEXT,
  profile_email TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow creating a profile for the authenticated user
  IF auth.uid() = profile_id THEN
    INSERT INTO profiles (id, full_name, avatar_url, email)
    VALUES (profile_id, profile_full_name, profile_avatar_url, profile_email);
  ELSE
    RAISE EXCEPTION 'Not authorized to create profile for this user';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_profile TO authenticated; 
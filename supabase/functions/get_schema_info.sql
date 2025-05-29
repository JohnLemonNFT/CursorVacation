-- Create a function to get schema information
CREATE OR REPLACE FUNCTION get_schema_info()
RETURNS TEXT[] 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tables TEXT[];
BEGIN
  -- Get all table names in the public schema
  SELECT array_agg(table_name::TEXT)
  INTO tables
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
  
  RETURN tables;
END;
$$;

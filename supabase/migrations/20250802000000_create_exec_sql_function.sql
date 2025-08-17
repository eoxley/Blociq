-- Create a function to execute SQL queries dynamically
-- This is needed for the batch group API to work properly
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Execute the SQL and return as JSON
  EXECUTE 'SELECT json_agg(t) FROM (' || sql || ') t' INTO result;
  
  -- Return empty array if no results
  IF result IS NULL THEN
    result := '[]'::json;
  END IF;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN json_build_object(
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION exec_sql(text) IS 'Execute SQL queries dynamically and return results as JSON';

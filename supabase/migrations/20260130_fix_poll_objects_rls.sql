-- Ensure authenticated users can read poll objects (including points)
DROP POLICY IF EXISTS "Allow authenticated read" ON poll_objects;
CREATE POLICY "Allow authenticated read"
ON poll_objects
FOR SELECT
TO authenticated
USING (true);

-- Ensure anon users can also read (redundant if public, but good for safety)
DROP POLICY IF EXISTS "Allow anon read" ON poll_objects;
CREATE POLICY "Allow anon read"
ON poll_objects
FOR SELECT
TO anon
USING (true);

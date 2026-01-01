-- Add public read policies for all tables
-- This allows anyone to read data from these tables

-- Policy for grouping table
CREATE POLICY "Allow public read access on grouping"
ON public.grouping
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy for led-text table
CREATE POLICY "Allow public read access on led-text"
ON public."led-text"
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy for group_usage table
CREATE POLICY "Allow public read access on group_usage"
ON public.group_usage
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow updates on group_usage for busy status
CREATE POLICY "Allow public update on group_usage"
ON public.group_usage
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Allow inserts on group_usage
CREATE POLICY "Allow public insert on group_usage"
ON public.group_usage
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

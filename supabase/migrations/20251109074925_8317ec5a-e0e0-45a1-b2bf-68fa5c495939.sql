-- Add first_name and last_name columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Migrate existing data: split name into first_name and last_name
UPDATE public.profiles 
SET 
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = CASE 
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 1 
    THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    ELSE ''
  END
WHERE name IS NOT NULL;

-- Make first_name required, last_name optional
ALTER TABLE public.profiles 
ALTER COLUMN first_name SET NOT NULL;

-- Drop the old name column (optional - you can keep it for backward compatibility)
-- ALTER TABLE public.profiles DROP COLUMN name;

-- Or keep name as computed column (generated)
UPDATE public.profiles 
SET name = CONCAT(first_name, ' ', last_name)
WHERE first_name IS NOT NULL;
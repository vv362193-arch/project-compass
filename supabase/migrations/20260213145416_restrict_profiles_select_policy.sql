-- Drop the overly permissive profiles SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a stricter policy: users can only see their own profile
-- and profiles of users who share at least one project with them.
CREATE POLICY "Users can view own and teammate profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.project_members my
    JOIN public.project_members their ON my.project_id = their.project_id
    WHERE my.user_id = auth.uid()
      AND their.user_id = profiles.id
  )
);

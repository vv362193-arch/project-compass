-- Fix: "Unauthorized Users Could Create Fake Profiles"
-- Fix: "Missing Profile Creation Policy Breaks User Registration"
--
-- Add a safe INSERT policy so authenticated users can only create
-- their own profile (id must match auth.uid()). This acts as a safety
-- net if the handle_new_user() trigger fails, and prevents anyone
-- from creating profiles with a different user's ID.

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

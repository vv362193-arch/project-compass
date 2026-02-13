
-- Fix the Owners can add members policy to include the check in WITH CHECK
DROP POLICY IF EXISTS "Owners can add members" ON public.project_members;

CREATE POLICY "Owners can add members" 
ON public.project_members 
FOR INSERT 
WITH CHECK (
  public.is_project_owner(project_id)
);

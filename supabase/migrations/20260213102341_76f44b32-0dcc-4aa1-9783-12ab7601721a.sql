-- Rename existing 'viewer' roles to 'worker'
UPDATE public.project_members SET role = 'worker' WHERE role = 'viewer';

-- Update can_write_project to include 'worker' (they need UPDATE on tasks for status changes)
CREATE OR REPLACE FUNCTION public.can_write_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'member', 'worker')
  )
$$;
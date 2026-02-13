
-- Create a security definer function to check member role
CREATE OR REPLACE FUNCTION public.get_member_role(_project_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.project_members
  WHERE project_id = _project_id AND user_id = auth.uid()
  LIMIT 1
$$;

-- Helper: can the current user write (owner or member, not viewer)
CREATE OR REPLACE FUNCTION public.can_write_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'member')
  )
$$;

-- Update task policies to use role-based access
DROP POLICY IF EXISTS "Members can create tasks" ON public.tasks;
CREATE POLICY "Writers can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (can_write_project(project_id) AND creator_id = auth.uid());

DROP POLICY IF EXISTS "Members can update tasks" ON public.tasks;
CREATE POLICY "Writers can update tasks"
  ON public.tasks FOR UPDATE
  USING (can_write_project(project_id));

DROP POLICY IF EXISTS "Members can delete tasks" ON public.tasks;
CREATE POLICY "Writers can delete tasks"
  ON public.tasks FOR DELETE
  USING (can_write_project(project_id));

-- Keep view policy unchanged (all members including viewers can see tasks)

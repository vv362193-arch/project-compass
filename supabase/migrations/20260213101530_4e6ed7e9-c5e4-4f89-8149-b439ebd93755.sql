
-- Allow owners to update member roles
CREATE POLICY "Owners can update members"
  ON public.project_members FOR UPDATE
  USING (is_project_owner(project_id))
  WITH CHECK (is_project_owner(project_id));

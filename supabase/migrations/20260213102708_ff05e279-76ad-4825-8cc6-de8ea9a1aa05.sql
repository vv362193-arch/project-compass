-- Create comments table
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Members of the project can view comments on tasks in their projects
CREATE POLICY "Project members can view comments"
ON public.comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = comments.task_id
      AND is_project_member(t.project_id)
  )
);

-- Writers and workers can insert comments
CREATE POLICY "Writers and workers can add comments"
ON public.comments
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = comments.task_id
      AND can_write_project(t.project_id)
  )
);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.comments
FOR DELETE
USING (user_id = auth.uid());

-- Create index for fast lookups
CREATE INDEX idx_comments_task_id ON public.comments(task_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at);
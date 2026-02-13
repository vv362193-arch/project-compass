
-- Add executor_id column to tasks table
ALTER TABLE public.tasks ADD COLUMN executor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_tasks_executor_id ON public.tasks(executor_id);

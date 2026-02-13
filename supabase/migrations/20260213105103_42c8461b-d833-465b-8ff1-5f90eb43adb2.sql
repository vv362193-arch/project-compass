
-- Add a flag to mark task as completed (approved by owner) - persists even if moved back
ALTER TABLE public.tasks ADD COLUMN was_completed boolean NOT NULL DEFAULT false;

-- Add completed_at timestamp to track when it was first approved
ALTER TABLE public.tasks ADD COLUMN completed_at timestamp with time zone;

-- Create a trigger to set was_completed and completed_at when status changes to 'done'
CREATE OR REPLACE FUNCTION public.mark_task_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM 'done') THEN
    NEW.was_completed := true;
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_mark_task_completed
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_task_completed();

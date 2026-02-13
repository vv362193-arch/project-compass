import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Clock, Flag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTasks, useProjectMembers, type Task } from '@/hooks/useTasks';
import { TaskComments } from '@/components/TaskComments';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Enums } from '@/integrations/supabase/types';

const priorityLabels: Record<string, { label: string; emoji: string }> = {
  urgent: { label: 'Urgent', emoji: '🔴' },
  high: { label: 'High', emoji: '🟠' },
  medium: { label: 'Medium', emoji: '🟡' },
  low: { label: 'Low', emoji: '🔵' },
};

interface Props {
  task: Task | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
}

export function EditTaskDialog({ task, projectId, open, onOpenChange, readOnly = false }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Enums<'task_priority'>>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [executorId, setExecutorId] = useState<string>('');
  const [deadline, setDeadline] = useState<Date | undefined>();
  const { updateTask } = useTasks(projectId);
  const { data: members } = useProjectMembers(projectId);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setAssigneeId(task.assignee_id || '');
      setExecutorId((task as any).executor_id || '');
      if (task.deadline) {
        const [y, m, d] = task.deadline.split('T')[0].split('-').map(Number);
        setDeadline(new Date(y, m - 1, d));
      } else {
        setDeadline(undefined);
      }
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !title.trim()) return;
    if (assigneeId && executorId && assigneeId === executorId) {
      toast.error('Assignee and Executor cannot be the same person');
      return;
    }
    updateTask.mutate(
      {
        id: task.id,
        title: title.trim(),
        description: description.trim(),
        priority,
        assignee_id: assigneeId || null,
        executor_id: executorId || null,
        deadline: deadline
          ? `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(deadline.getDate()).padStart(2, '0')}T00:00:00`
          : null,
      } as any,
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const assigneeName = members?.find((m) => m.user_id === assigneeId)?.profiles;
  const executorName = members?.find((m) => m.user_id === executorId)?.profiles;
  if (readOnly) {
    const p = priorityLabels[task?.priority || 'medium'];
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg leading-snug pr-6">
              {task?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 mt-1">
            <Badge variant="outline" className="gap-1 text-xs font-normal">
              <Flag className="h-3 w-3" />
              {p.emoji} {p.label}
            </Badge>
            {deadline && (
              <Badge variant="outline" className="gap-1 text-xs font-normal">
                <Clock className="h-3 w-3" />
                {format(deadline, 'MMM d, yyyy')}
              </Badge>
            )}
            {assigneeName && (
              <Badge variant="outline" className="gap-1 text-xs font-normal">
                <User className="h-3 w-3" />
                👤 {(assigneeName as any)?.name || 'Assigned'}
              </Badge>
            )}
            {executorName && (
              <Badge variant="outline" className="gap-1 text-xs font-normal">
                <User className="h-3 w-3" />
                🛠️ {(executorName as any)?.name || 'Executor'}
              </Badge>
            )}
          </div>

          {task?.description ? (
            <ScrollArea className="mt-3 max-h-64">
              <div className="rounded-md bg-muted/50 p-4">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                  {task.description}
                </p>
              </div>
            </ScrollArea>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground italic">No description</p>
          )}

          {task && (
            <div className="border-t border-border pt-4 mt-2">
              <TaskComments taskId={task.id} canComment />
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="bg-background"
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task details..."
              className="bg-background resize-none"
              rows={3}
              maxLength={1000}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Enums<'task_priority'>)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="low">🔵 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {members?.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {(m.profiles as any)?.name || 'No name'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Executor</Label>
              <Select value={executorId} onValueChange={setExecutorId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="No executor" />
                </SelectTrigger>
                <SelectContent>
                  {members?.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {(m.profiles as any)?.name || 'No name'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Deadline</Label>
            <Popover modal>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background",
                    !deadline && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[9999]" align="start" side="bottom" sideOffset={4} avoidCollisions={false}>
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button type="submit" className="w-full" disabled={updateTask.isPending}>
            {updateTask.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
        {task && (
          <div className="border-t border-border pt-4">
            <TaskComments taskId={task.id} canComment />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
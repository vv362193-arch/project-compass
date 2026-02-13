import { useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTasks, useProjectMembers } from '@/hooks/useTasks';
import type { Enums } from '@/integrations/supabase/types';

interface Props {
  projectId: string;
}

export function CreateTaskDialog({ projectId }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Enums<'task_priority'>>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [executorId, setExecutorId] = useState<string>('');
  const [deadline, setDeadline] = useState<Date | undefined>();
  const { createTask } = useTasks(projectId);
  const { data: members } = useProjectMembers(projectId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (assigneeId && executorId && assigneeId === executorId) {
      toast.error('Assignee and Executor cannot be the same person');
      return;
    }
    createTask.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        priority,
        assignee_id: assigneeId || null,
        executor_id: executorId || null,
        deadline: deadline
          ? `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(deadline.getDate()).padStart(2, '0')}T00:00:00`
          : null,
        project_id: projectId,
      } as any,
      {
        onSuccess: () => {
          setOpen(false);
          setTitle('');
          setDescription('');
          setPriority('medium');
          setAssigneeId('');
          setExecutorId('');
          setDeadline(undefined);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         <Button size="sm" className="gap-1.5">
           <Plus className="h-4 w-4" />
           New Task
         </Button>
       </DialogTrigger>
       <DialogContent className="bg-card">
         <DialogHeader>
           <DialogTitle>Create Task</DialogTitle>
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
           <Button type="submit" className="w-full" disabled={createTask.isPending}>
             {createTask.isPending ? 'Creating...' : 'Create Task'}
           </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

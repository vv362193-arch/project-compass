import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { TaskCard } from './TaskCard';
import { EditTaskDialog } from './EditTaskDialog';
import { RejectTaskDialog } from './RejectTaskDialog';
import { useTasks, useMyProjectRole, type Task } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useComments } from '@/hooks/useComments';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Enums } from '@/integrations/supabase/types';

const columns: { id: Enums<'task_status'>; label: string; colorClass: string }[] = [
  { id: 'todo', label: 'To Do', colorClass: 'bg-status-todo' },
  { id: 'in_progress', label: 'In Progress', colorClass: 'bg-status-in-progress' },
  { id: 'review', label: 'Review', colorClass: 'bg-status-review' },
  { id: 'done', label: 'Done', colorClass: 'bg-status-done' },
];

interface Props {
  projectId: string;
}

export function KanbanBoard({ projectId }: Props) {
  const { tasks, updateTask, deleteTask } = useTasks(projectId);
  const { data: myRole } = useMyProjectRole(projectId);
  const { user } = useAuth();
  const canWrite = myRole === 'owner' || myRole === 'member';
  const isOwner = myRole === 'owner';
  const canDrag = canWrite || myRole === 'worker';
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'my'>('all');
  const [rejectingTask, setRejectingTask] = useState<Task | null>(null);
  const { addComment } = useComments(rejectingTask?.id ?? '');

  const myExecutorTasks = tasks.filter((t) => (t as any).executor_id === user?.id);
  const filteredTasks = filter === 'my' ? myExecutorTasks : tasks;

  const tasksByStatus = columns.reduce((acc, col) => {
    acc[col.id] = filteredTasks.filter((t) => t.status === col.id);
    return acc;
  }, {} as Record<string, Task[]>);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const taskId = result.draggableId;
    let newStatus = result.destination.droppableId as Enums<'task_status'>;

    // Workers can't move directly to "done" — redirect to "review"
    if (myRole === 'worker' && newStatus === 'done') {
      newStatus = 'review';
      toast.info('Task sent for review. Waiting for owner approval.');
    }

    // Only owners can move tasks from "review" to "done" (approval)
    const task = tasks.find((t) => t.id === taskId);
    if (task?.status === 'review' && newStatus === 'done' && !isOwner) {
      toast.error('Only the project owner can approve tasks.');
      return;
    }

    // Workers cannot move approved (done) tasks
    if (task?.status === 'done' && !isOwner) {
      toast.error('Approved tasks can only be moved by the owner.');
      return;
    }

    updateTask.mutate({ id: taskId, status: newStatus });
  };

  const handleApprove = (task: Task) => {
    updateTask.mutate({ id: task.id, status: 'done' });
    toast.success('Task approved!');
  };

  const handleReject = (reason: string) => {
    if (!rejectingTask) return;
    // Add rejection comment
    addComment.mutate(reason, {
      onSuccess: () => {
        // Move task back to todo
        updateTask.mutate({ id: rejectingTask.id, status: 'todo' });
        toast.info('Task rejected and sent back for revision.');
        setRejectingTask(null);
      },
    });
  };

  return (
    <>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'my')} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="my">
            My Tasks ({myExecutorTasks.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <div key={col.id} className="flex w-72 shrink-0 flex-col">
              <div className="mb-3 flex items-center gap-2.5 px-1">
                <div className={cn('h-2 w-2 rounded-full', col.colorClass)} />
                <h3 className="text-sm font-medium text-foreground">{col.label}</h3>
                <span className="text-xs text-muted-foreground">{tasksByStatus[col.id]?.length || 0}</span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex min-h-[200px] flex-1 flex-col gap-2 rounded-lg border border-transparent p-1.5 transition-colors',
                      snapshot.isDraggingOver && 'border-primary/30 bg-primary/5'
                    )}
                  >
                    {tasksByStatus[col.id]?.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!canDrag}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(snapshot.isDragging && 'opacity-90', !canDrag && 'cursor-default')}
                            onClick={() => !snapshot.isDragging && (canWrite || myRole === 'worker') && setEditingTask(task)}
                          >
                            <TaskCard
                              task={task}
                              onDelete={canWrite ? (id) => deleteTask.mutate(id) : undefined}
                            />
                            {/* Approve/Reject buttons for owner on review tasks */}
                            {col.id === 'review' && isOwner && (
                              <div className="mt-1 flex gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 h-7 text-xs gap-1 border-green-600/30 text-green-600 hover:bg-green-600/10 hover:text-green-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApprove(task);
                                  }}
                                >
                                  <Check className="h-3 w-3" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 h-7 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRejectingTask(task);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <EditTaskDialog
        task={editingTask}
        projectId={projectId}
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        readOnly={myRole === 'worker'}
      />

      <RejectTaskDialog
        open={!!rejectingTask}
        onOpenChange={(open) => !open && setRejectingTask(null)}
        onReject={handleReject}
        isPending={addComment.isPending}
      />
    </>
  );
}

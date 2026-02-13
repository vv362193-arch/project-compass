import { format, isPast } from 'date-fns';
import { Calendar, Trash2, User, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/hooks/useTasks';


const priorityConfig = {
  urgent: { label: 'Urgent', className: 'bg-priority-urgent' },
  high: { label: 'High', className: 'bg-priority-high' },
  medium: { label: 'Medium', className: 'bg-priority-medium' },
  low: { label: 'Low', className: 'bg-priority-low' },
};

interface Props {
  task: Task;
  onDelete?: (id: string) => void;
}

export function TaskCard({ task, onDelete }: Props) {
  const priority = priorityConfig[task.priority];
  const isOverdue = task.deadline && isPast(new Date(task.deadline)) && task.status !== 'done';

  return (
    <div
      className={cn(
        'group rounded-lg border border-border bg-card p-3 transition-colors hover:border-muted-foreground/30',
        isOverdue && 'border-destructive/40'
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-foreground leading-snug">{task.title}</h4>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {task.description && (
        <p className="mb-2.5 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium', priority.className)}>
          {priority.label}
        </span>

        {task.deadline && (
           <span className={cn(
             'inline-flex items-center gap-1 text-[10px] text-muted-foreground',
             isOverdue && 'text-destructive'
           )}>
             <Calendar className="h-3 w-3" />
             {format(new Date(task.deadline), 'd MMM')}
           </span>
         )}

        {(task.profiles || task.executor_profiles) && (
          <span className="ml-auto inline-flex items-center gap-2 text-[10px] text-muted-foreground">
            {task.profiles && (
              <span className="inline-flex items-center gap-1" title="Assignee">
                <User className="h-3 w-3" />
                {task.profiles.name}
              </span>
            )}
            {task.executor_profiles && (
              <span className="inline-flex items-center gap-1" title="Executor">
                <Wrench className="h-3 w-3" />
                {task.executor_profiles.name}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

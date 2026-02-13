import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isPast } from 'date-fns';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertTriangle, ListTodo, ArrowUpRight, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const statusLabels: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const statusColors: Record<string, string> = {
  todo: 'bg-status-todo',
  in_progress: 'bg-status-in-progress',
  review: 'bg-status-review',
  done: 'bg-status-done',
};

type TaskRow = {
  id: string;
  status: string;
  priority: string;
  deadline: string | null;
  assignee_id: string | null;
  executor_id: string | null;
  project_id: string;
  title: string;
  was_completed: boolean;
  completed_at: string | null;
};

type ProfileRow = { id: string; name: string; avatar_url: string | null };

function computeStats(tasks: TaskRow[], useWasCompleted = false) {
  const totalTasks = tasks.length;
  const completedCount = useWasCompleted
    ? tasks.filter((t) => t.was_completed).length
    : tasks.filter((t) => t.status === 'done').length;
  const byStatus = {
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    review: tasks.filter((t) => t.status === 'review').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };
  const overdue = tasks.filter(
    (t) => t.deadline && isPast(new Date(t.deadline)) && t.status !== 'done'
  ).length;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  return { totalTasks, byStatus, overdue, completionRate, completedCount };
}

function StatsCards({ tasks, useWasCompleted = false }: { tasks: TaskRow[]; useWasCompleted?: boolean }) {
  const { totalTasks, byStatus, overdue, completionRate, completedCount } = computeStats(tasks, useWasCompleted);

  const stats = [
    { label: 'Total Tasks', value: totalTasks, icon: ListTodo, color: 'text-foreground' },
    { label: 'Completed', value: `${completedCount} (${completionRate}%)`, icon: CheckCircle, color: 'text-status-done' },
    { label: 'In Progress', value: byStatus.in_progress, icon: ArrowUpRight, color: 'text-status-in-progress' },
    { label: 'Overdue', value: overdue, icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="rounded-lg border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
            <stat.icon className={cn('h-4 w-4', stat.color)} />
          </div>
          <p className={cn('mt-2 text-2xl font-semibold', stat.color)}>{stat.value}</p>
        </motion.div>
      ))}
    </div>
  );
}

function StatusBreakdown({ tasks }: { tasks: TaskRow[] }) {
  const { totalTasks, byStatus } = computeStats(tasks);
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-medium text-foreground">Tasks by Status</h3>
      <div className="space-y-3">
        {Object.entries(byStatus).map(([status, count]) => {
          const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
          return (
            <div key={status} className="flex items-center gap-3">
              <div className={cn('h-2 w-2 shrink-0 rounded-full', statusColors[status])} />
              <span className="w-24 text-sm text-foreground">{statusLabels[status]}</span>
              <div className="flex-1">
                <div className="h-2 rounded-full bg-muted">
                  <motion.div
                    className={cn('h-2 rounded-full', statusColors[status])}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  />
                </div>
              </div>
              <span className="w-8 text-right text-sm text-muted-foreground">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MemberStats({ tasks, profiles, memberUserIds }: { tasks: TaskRow[]; profiles: ProfileRow[]; memberUserIds: string[] }) {
  // Group tasks by executor_id (primary) or assignee_id (fallback)
  const byMember = new Map<string, TaskRow[]>();
  tasks.forEach((t) => {
    const uid = t.executor_id || t.assignee_id;
    if (uid) {
      const list = byMember.get(uid) || [];
      list.push(t);
      byMember.set(uid, list);
    }
  });

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Show all project members, not just those with assigned tasks
  const uniqueIds = Array.from(new Set(memberUserIds));
  const entries = uniqueIds
    .map((uid) => ({ profile: profileMap.get(uid), tasks: byMember.get(uid) || [] }))
    .filter((e) => e.profile)
    .sort((a, b) => b.tasks.length - a.tasks.length);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">No project members found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map(({ profile, tasks: userTasks }, idx) => {
        const s = computeStats(userTasks, true);
        return (
          <motion.div
            key={profile!.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-lg border border-border bg-card p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-muted">
                  {profile!.name[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{profile!.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.totalTasks} task{s.totalTasks !== 1 ? 's' : ''} · {s.completionRate}% done
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-3">
              {Object.entries(s.byStatus).map(([status, count]) => (
                <div key={status} className="text-center">
                  <div className={cn('mx-auto mb-1 h-1.5 w-1.5 rounded-full', statusColors[status])} />
                  <p className="text-lg font-semibold text-foreground">{count}</p>
                  <p className="text-[10px] text-muted-foreground">{statusLabels[status]}</p>
                </div>
              ))}
            </div>

            {/* Mini progress bar */}
            <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
              {Object.entries(s.byStatus).map(([status, count]) => {
                const pct = s.totalTasks > 0 ? (count / s.totalTasks) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <motion.div
                    key={status}
                    className={cn(statusColors[status])}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  />
                );
              })}
            </div>

            {s.overdue > 0 && (
              <p className="mt-2 text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {s.overdue} overdue
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();

  const { data: tasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, status, priority, deadline, assignee_id, executor_id, project_id, title, was_completed, completed_at')
        .limit(1000);
      if (error) throw error;
      return data as TaskRow[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 3,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .limit(500);
      if (error) throw error;
      return data as ProfileRow[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Check if user is owner of any project and get member user IDs
  const { data: ownedMembers = [] } = useQuery({
    queryKey: ['owned-project-members'],
    queryFn: async () => {
      // Get projects where user is owner
      const { data: ownedProjects, error: pErr } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user!.id)
        .eq('role', 'owner');
      if (pErr) throw pErr;
      if (!ownedProjects?.length) return [];

      const projectIds = ownedProjects.map((p) => p.project_id);
      const { data: members, error: mErr } = await supabase
        .from('project_members')
        .select('user_id')
        .in('project_id', projectIds);
      if (mErr) throw mErr;
      return members?.map((m) => m.user_id) ?? [];
    },
    enabled: !!user,
  });

  const isOwnerOfAny = ownedMembers.length > 0;

  // Filter tasks where current user is executor or assignee
  const myTasks = tasks.filter((t) => t.executor_id === user?.id || t.assignee_id === user?.id);

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Overview of tasks across all projects</p>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              <ListTodo className="h-3.5 w-3.5" />
              All Tasks
            </TabsTrigger>
            <TabsTrigger value="my" className="gap-1.5">
              <User className="h-3.5 w-3.5" />
              My Tasks
            </TabsTrigger>
            {isOwnerOfAny && (
              <TabsTrigger value="team" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                By Member
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <StatsCards tasks={tasks} />
            <StatusBreakdown tasks={tasks} />
          </TabsContent>

          <TabsContent value="my" className="space-y-6">
            <StatsCards tasks={myTasks} useWasCompleted />
            <StatusBreakdown tasks={myTasks} />
          </TabsContent>

          <TabsContent value="team">
            <MemberStats tasks={tasks} profiles={profiles} memberUserIds={ownedMembers} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Task = Tables<'tasks'> & {
  profiles?: { name: string; avatar_url: string | null } | null;
  executor_profiles?: { name: string; avatar_url: string | null } | null;
};

export function useTasks(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, profiles!tasks_assignee_id_fkey(name, avatar_url), executor_profiles:profiles!tasks_executor_id_fkey(name, avatar_url)')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as unknown as Task[];
    },
    enabled: !!user && !!projectId,
  });

  const createTask = useMutation({
    mutationFn: async (task: Omit<TablesInsert<'tasks'>, 'creator_id'>) => {
      const { error } = await supabase
        .from('tasks')
        .insert({ ...task, creator_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success('Task created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Tables<'tasks'>>) => {
      const { error } = await supabase.from('tasks').update(updates).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });
      const previous = queryClient.getQueryData<Task[]>(['tasks', projectId]);
      queryClient.setQueryData<Task[]>(['tasks', projectId], (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...updates } : t)) ?? []
      );
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', projectId], context.previous);
      }
      toast.error(error.message);
      // Перезапросить только при ошибке, чтобы откат был достоверным
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success('Task deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    tasks: tasksQuery.data ?? [],
    isLoading: tasksQuery.isLoading,
    createTask,
    updateTask,
    deleteTask,
  };
}

export function useProjectMembers(projectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('*, profiles:user_id(id, name, avatar_url)')
        .eq('project_id', projectId!);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!projectId,
  });
}

export function useMyProjectRole(projectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-project-role', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId!)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role ?? null;
    },
    enabled: !!user && !!projectId,
  });
}

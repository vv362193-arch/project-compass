import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, project_members(count)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createProject = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const { error } = await supabase
        .from('projects')
        .insert({ name, description, owner_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      // Only owners can delete — RLS enforces this on the DB side
      const { data, error, count } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('owner_id', user!.id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Only the project owner can delete this project');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { projects: projectsQuery.data ?? [], isLoading: projectsQuery.isLoading, createProject, deleteProject };
}

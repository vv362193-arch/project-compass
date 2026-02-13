import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { KanbanBoard } from '@/components/KanbanBoard';
import { CreateTaskDialog } from '@/components/CreateTaskDialog';
import { InviteMemberDialog } from '@/components/InviteMemberDialog';
import { ProjectMembers } from '@/components/ProjectMembers';
import { useTasks, useMyProjectRole } from '@/hooks/useTasks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

export default function ProjectBoard() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { isLoading } = useTasks(projectId);
  const { data: myRole } = useMyProjectRole(projectId);
  const isOwner = myRole === 'owner';
  const canWrite = myRole === 'owner' || myRole === 'member';

  if (!projectId) return null;

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-6">
          <Link
            to="/"
            className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Projects
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{project?.name || 'Loading...'}</h1>
              {project?.description && (
                <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ProjectMembers projectId={projectId} />
              {isOwner && <InviteMemberDialog projectId={projectId} />}
              {canWrite && <CreateTaskDialog projectId={projectId} />}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 w-72 shrink-0 animate-pulse rounded-lg border border-border bg-card" />
            ))}
          </div>
        ) : (
          <KanbanBoard projectId={projectId} />
        )}
      </div>
    </AppLayout>
  );
}

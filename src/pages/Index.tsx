import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { CreateProjectDialog } from '@/components/CreateProjectDialog';
import { useProjects } from '@/hooks/useProjects';
import { FolderOpen, Trash2, Users, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function Index() {
  const { projects, isLoading, deleteProject } = useProjects();

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your team's tasks</p>
          </div>
          <CreateProjectDialog />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-lg border border-border bg-card" />
            ))}
          </div>
        ) : projects.length === 0 ? (
           <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20">
            <FolderOpen className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="mb-1 text-sm font-medium text-foreground">No projects</p>
            <p className="mb-4 text-xs text-muted-foreground">Create your first project to get started</p>
            <CreateProjectDialog />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, idx) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  to={`/project/${project.id}`}
                  className="group flex flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-muted-foreground/30"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteProject.mutate(project.id);
                      }}
                      className="rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {project.description && (
                    <p className="mb-3 text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                       <Users className="h-3.5 w-3.5" />
                       {(project as any).project_members?.[0]?.count ?? 0}
                     </div>
                     <span>{format(new Date(project.created_at), 'd MMM yyyy')}</span>
                   </div>
                   <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                     Open <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

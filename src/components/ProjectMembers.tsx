import { useProjectMembers, useMyProjectRole } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Trash2, Users, Crown, UserCheck, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface Props {
  projectId: string;
}

export function ProjectMembers({ projectId }: Props) {
  const { user } = useAuth();
  const { data: members } = useProjectMembers(projectId);
  const { data: myRole } = useMyProjectRole(projectId);
  const queryClient = useQueryClient();
  const isOwner = myRole === 'owner';

  const updateRole = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Role updated');
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleRoleChange = (memberId: string, newRole: string) => {
    updateRole.mutate({ memberId, newRole });
  };

  const handleRemove = (memberId: string) => {
    removeMember.mutate(memberId);
  };

  return (
    <TooltipProvider>
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5">
            <Users className="h-4 w-4" />
            {members?.length || 0}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="end">
          <h4 className="mb-3 text-sm font-medium text-foreground">Team Members</h4>
          <div className="space-y-2">
            {members?.map((m) => {
              const profile = m.profiles as any;
              const isSelf = m.user_id === user?.id;
              const isOwnerMember = m.role === 'owner';
              
              const getRoleIcon = () => {
                switch (m.role) {
                  case 'owner':
                    return <Crown className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />;
                  case 'member':
                    return <UserCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />;
                  case 'worker':
                    return <Wrench className="h-3.5 w-3.5 text-blue-500" />;
                  default:
                    return null;
                }
              };

              const getRoleDescription = () => {
                switch (m.role) {
                  case 'owner':
                    return 'Full access, can manage members and project settings';
                  case 'member':
                    return 'Can create, edit, and manage tasks';
                  case 'worker':
                    return 'Can view tasks, change status, and leave comments';
                  default:
                    return '';
                }
              };

              return (
                <div key={m.id} className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px] bg-muted">
                      {(profile?.name || '?')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {profile?.name || 'Unknown'}{isSelf ? ' (you)' : ''}
                    </p>
                  </div>
                  {isOwner && !isOwnerMember ? (
                    <div className="flex items-center gap-1">
                      <Select value={m.role} onValueChange={(v) => handleRoleChange(m.id, v)}>
                        <SelectTrigger className="h-7 w-[90px] text-[11px] bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="worker">Worker</SelectItem>
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => handleRemove(m.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">{getRoleIcon()}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{getRoleDescription()}</p>
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-[11px] text-muted-foreground capitalize">{m.role}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}

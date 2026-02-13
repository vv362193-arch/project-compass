import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Props {
  projectId: string;
}

export function InviteMemberDialog({ projectId }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('member');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('find-user-by-email', {
        body: { email: trimmed },
      });

      if (response.error || response.data?.error) {
        const msg = response.data?.error || response.error?.message || 'User not found';
        if (msg === 'User not found') {
          toast.error('No registered user with this email');
        } else {
          toast.error(msg);
        }
        setLoading(false);
        return;
      }

      const profile = response.data;

      const { error } = await supabase
        .from('project_members')
        .insert({ project_id: projectId, user_id: profile.id, role });

      if (error) {
        if (error.code === '23505') {
          toast.error('User is already a project member');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success(`${profile.name} added as ${role}`);
        queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
        setOpen(false);
        setEmail('');
        setRole('member');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="bg-background"
              required
              maxLength={255}
            />
            <p className="text-xs text-muted-foreground">
              User must be registered in the system
            </p>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member — can create & edit tasks</SelectItem>
                <SelectItem value="worker">Worker — can change status & comment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Adding...' : 'Add'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { createProject } = useProjects();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createProject.mutate({ name: name.trim(), description: description.trim() }, {
      onSuccess: () => {
        setOpen(false);
        setName('');
        setDescription('');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         <Button size="sm" className="gap-1.5">
           <Plus className="h-4 w-4" />
           New Project
         </Button>
       </DialogTrigger>
       <DialogContent className="bg-card">
         <DialogHeader>
           <DialogTitle>Create Project</DialogTitle>
         </DialogHeader>
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              className="bg-background"
              required
              maxLength={100}
            />
          </div>
           <div className="space-y-2">
             <Label htmlFor="project-desc">Description</Label>
             <Textarea
               id="project-desc"
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               placeholder="Brief project description..."
              className="bg-background resize-none"
              rows={3}
              maxLength={500}
            />
          </div>
           <Button type="submit" className="w-full" disabled={createProject.isPending}>
             {createProject.isPending ? 'Creating...' : 'Create'}
           </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

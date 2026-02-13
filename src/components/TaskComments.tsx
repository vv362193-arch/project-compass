import { useState, useRef, useEffect } from 'react';
import { useComments } from '@/hooks/useComments';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  taskId: string;
  canComment?: boolean;
}

export function TaskComments({ taskId, canComment = true }: Props) {
  const { user } = useAuth();
  const { comments, isLoading, addComment, deleteComment } = useComments(taskId);
  const [content, setContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    addComment.mutate(content.trim(), {
      onSuccess: () => setContent(''),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-medium text-foreground">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h4>

      <div
        ref={scrollRef}
        className="max-h-48 space-y-3 overflow-y-auto pr-1"
      >
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No comments yet</p>
        ) : (
          comments.map((c) => {
            const profile = c.profiles;
            const isOwn = c.user_id === user?.id;

            return (
              <div key={c.id} className="group flex gap-2">
                <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                  <AvatarFallback className="text-[9px] bg-muted">
                    {(profile?.name || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {profile?.name || 'Unknown'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </span>
                    {isOwn && (
                      <button
                        onClick={() => deleteComment.mutate(c.id)}
                        className="ml-auto hidden rounded p-0.5 text-muted-foreground hover:text-destructive group-hover:block"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-foreground/80 whitespace-pre-wrap break-words">
                    {c.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {canComment && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment..."
            className="bg-background resize-none text-xs min-h-[36px] h-9"
            rows={1}
            maxLength={500}
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="shrink-0 h-9 w-9"
            disabled={!content.trim() || addComment.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}

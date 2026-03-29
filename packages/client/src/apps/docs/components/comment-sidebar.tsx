import { useState } from 'react';
import { MessageSquare, Check, Trash2, X } from 'lucide-react';
import {
  useDocComments,
  useCreateDocComment,
  useResolveDocComment,
  useDeleteDocComment,
} from '../hooks/use-doc-comments';
import type { DocumentComment } from '@atlasmail/shared';
import { Button } from '../../../components/ui/button';
import { IconButton } from '../../../components/ui/icon-button';
import { Textarea } from '../../../components/ui/textarea';

interface CommentSidebarProps {
  docId: string;
  isOpen: boolean;
  onClose: () => void;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function CommentSidebar({ docId, isOpen, onClose }: CommentSidebarProps) {
  const { data: comments = [] } = useDocComments(docId);
  const createComment = useCreateDocComment();
  const resolveComment = useResolveDocComment();
  const deleteComment = useDeleteDocComment();
  const [newComment, setNewComment] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const activeComments = comments.filter((c: DocumentComment) => !c.isResolved && !c.parentId);
  const resolvedComments = comments.filter((c: DocumentComment) => c.isResolved && !c.parentId);
  const displayComments = showResolved ? [...activeComments, ...resolvedComments] : activeComments;

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    createComment.mutate({ docId, content: newComment.trim() });
    setNewComment('');
  };

  if (!isOpen) return null;

  return (
    <div className="w-72 border-l border-gray-200 bg-white flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Comments</span>
          {activeComments.length > 0 && (
            <span className="text-xs text-gray-400">({activeComments.length})</span>
          )}
        </div>
        <IconButton icon={<X className="w-4 h-4" />} label="Close" size={24} onClick={onClose} />
      </div>

      {/* New comment input */}
      <div className="px-3 py-2 border-b border-gray-100">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          style={{ resize: 'none', fontSize: 'var(--font-size-sm)' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
        />
        {newComment.trim() && (
          <div className="flex justify-end mt-1.5">
            <Button variant="primary" size="sm" onClick={handleSubmit}>
              Comment
            </Button>
          </div>
        )}
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto">
        {displayComments.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            No comments yet
          </div>
        ) : (
          displayComments.map((comment: DocumentComment) => (
            <div
              key={comment.id}
              className={`px-3 py-2.5 border-b border-gray-50 ${comment.isResolved ? 'opacity-50' : ''}`}
            >
              {comment.selectionText && (
                <div className="text-xs text-gray-400 bg-yellow-50 px-2 py-1 rounded mb-1.5 italic border-l-2 border-yellow-300">
                  &ldquo;{comment.selectionText}&rdquo;
                </div>
              )}
              <p className="text-sm text-gray-700">{comment.content}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-gray-400">{getRelativeTime(comment.createdAt)}</span>
                <div className="flex items-center gap-1">
                  {!comment.isResolved && (
                    <IconButton
                      icon={<Check className="w-3.5 h-3.5" />}
                      label="Resolve"
                      size={22}
                      onClick={() => resolveComment.mutate({ commentId: comment.id, docId })}
                    />
                  )}
                  <IconButton
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    label="Delete"
                    size={22}
                    destructive
                    onClick={() => deleteComment.mutate({ commentId: comment.id, docId })}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Show resolved toggle */}
      {resolvedComments.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowResolved(!showResolved)}
            style={{ fontSize: 12 }}
          >
            {showResolved ? 'Hide' : 'Show'} {resolvedComments.length} resolved
          </Button>
        </div>
      )}
    </div>
  );
}

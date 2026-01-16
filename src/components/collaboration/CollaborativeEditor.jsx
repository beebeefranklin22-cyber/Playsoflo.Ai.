import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, MessageSquare, Share2, Lock, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import PresenceIndicators from './PresenceIndicators';
import CommentPanel from './CommentPanel';
import ShareDocumentModal from './ShareDocumentModal';
import { toast } from 'sonner';

export default function CollaborativeEditor({ documentId, currentUser }) {
  const [content, setContent] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(null);
  const editorRef = useRef(null);
  const queryClient = useQueryClient();
  const saveTimeoutRef = useRef(null);
  const userColor = useRef(`#${Math.floor(Math.random()*16777215).toString(16)}`);

  // Fetch document
  const { data: document, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      const docs = await base44.entities.CollaborativeDocument.filter({ id: documentId });
      return docs[0];
    },
    enabled: !!documentId
  });

  // Subscribe to document changes
  useEffect(() => {
    if (!documentId) return;

    const unsubscribe = base44.entities.CollaborativeDocument.subscribe((event) => {
      if (event.id === documentId && event.type === 'update') {
        if (event.data.last_edited_by !== currentUser.email) {
          setContent(event.data.content || '');
          toast.info(`Document updated by ${event.data.last_edited_by}`);
        }
      }
    });

    return unsubscribe;
  }, [documentId, currentUser]);

  // Update presence
  useEffect(() => {
    if (!documentId || !currentUser) return;

    const updatePresence = async () => {
      try {
        const existingPresence = await base44.entities.DocumentPresence.filter({
          document_id: documentId,
          user_email: currentUser.email
        });

        const presenceData = {
          document_id: documentId,
          user_email: currentUser.email,
          user_name: currentUser.full_name,
          cursor_position: cursorPosition,
          color: userColor.current,
          last_seen: new Date().toISOString(),
          is_editing: true
        };

        if (existingPresence.length > 0) {
          await base44.entities.DocumentPresence.update(existingPresence[0].id, presenceData);
        } else {
          await base44.entities.DocumentPresence.create(presenceData);
        }
      } catch (error) {
        console.error('Presence update error:', error);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 5000);

    return () => {
      clearInterval(interval);
      // Mark as not editing
      base44.entities.DocumentPresence.filter({
        document_id: documentId,
        user_email: currentUser.email
      }).then(presence => {
        if (presence[0]) {
          base44.entities.DocumentPresence.update(presence[0].id, { is_editing: false });
        }
      });
    };
  }, [documentId, currentUser, cursorPosition]);

  // Initialize content
  useEffect(() => {
    if (document?.content) {
      setContent(document.content);
    }
  }, [document]);

  // Auto-save with debounce
  const saveContent = async (newContent) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await base44.entities.CollaborativeDocument.update(documentId, {
          content: newContent,
          last_edited_by: currentUser.email,
          last_edited_at: new Date().toISOString(),
          version: (document?.version || 0) + 1
        });
      } catch (error) {
        console.error('Save error:', error);
        toast.error('Failed to save changes');
      }
    }, 1000);
  };

  const handleContentChange = (value) => {
    setContent(value);
    saveContent(value);
  };

  const handleCursorChange = (range) => {
    if (range) {
      setCursorPosition({
        selection_start: range.index,
        selection_end: range.index + range.length
      });
    }
  };

  const canEdit = document?.owner_email === currentUser.email || 
                  document?.collaborators?.includes(currentUser.email);

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
    </div>;
  }

  return (
    <div className="relative h-full">
      {/* Toolbar */}
      <div className="glass-effect border-b border-white/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">{document?.title}</h2>
          {!canEdit && (
            <div className="flex items-center gap-1 text-yellow-400 text-sm">
              <Eye className="w-4 h-4" />
              <span>View Only</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <PresenceIndicators documentId={documentId} currentUser={currentUser} />
          
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 px-3 py-2 glass-effect rounded-lg hover:bg-white/10 transition"
          >
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span className="text-white text-sm">Comments</span>
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
          >
            <Share2 className="w-4 h-4 text-white" />
            <span className="text-white text-sm">Share</span>
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex h-[calc(100%-80px)]">
        <div className={`flex-1 overflow-auto ${showComments ? 'border-r border-white/10' : ''}`}>
          <ReactQuill
            ref={editorRef}
            value={content}
            onChange={handleContentChange}
            onChangeSelection={handleCursorChange}
            readOnly={!canEdit}
            theme="snow"
            className="h-full bg-transparent text-white"
            modules={{
              toolbar: canEdit ? [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                [{ color: [] }, { background: [] }],
                ['link', 'image'],
                ['clean']
              ] : false
            }}
          />
        </div>

        {showComments && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-96 bg-black/20 backdrop-blur-sm"
          >
            <CommentPanel
              documentId={documentId}
              currentUser={currentUser}
              onClose={() => setShowComments(false)}
            />
          </motion.div>
        )}
      </div>

      {showShareModal && (
        <ShareDocumentModal
          document={document}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
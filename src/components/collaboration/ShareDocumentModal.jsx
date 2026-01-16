import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Copy, Link2, Clock, Users, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ShareDocumentModal({ document, onClose }) {
  const [emailToAdd, setEmailToAdd] = useState('');
  const [shareExpiry, setShareExpiry] = useState('24');
  const [accessType, setAccessType] = useState('view');
  const [shareLink, setShareLink] = useState(null);
  const queryClient = useQueryClient();

  const generateShareLinkMutation = useMutation({
    mutationFn: async () => {
      const token = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(shareExpiry));

      await base44.entities.CollaborativeDocument.update(document.id, {
        share_token: token,
        share_expires_at: expiresAt.toISOString()
      });

      return `${window.location.origin}/shared/${token}`;
    },
    onSuccess: (link) => {
      setShareLink(link);
      toast.success('Share link generated');
    }
  });

  const addCollaboratorMutation = useMutation({
    mutationFn: async () => {
      const field = accessType === 'edit' ? 'collaborators' : 'viewers';
      const currentList = document[field] || [];
      
      if (currentList.includes(emailToAdd)) {
        throw new Error('User already has access');
      }

      await base44.entities.CollaborativeDocument.update(document.id, {
        [field]: [...currentList, emailToAdd]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['document', document.id]);
      setEmailToAdd('');
      toast.success('Collaborator added');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-effect rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Share Document</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Add Collaborator */}
        <div className="mb-6">
          <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Invite by email
          </label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={emailToAdd}
              onChange={(e) => setEmailToAdd(e.target.value)}
              placeholder="user@example.com"
              className="flex-1 bg-white/5 border-white/10 text-white"
            />
            <select
              value={accessType}
              onChange={(e) => setAccessType(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 text-white"
            >
              <option value="view">View</option>
              <option value="edit">Edit</option>
            </select>
            <Button
              onClick={() => addCollaboratorMutation.mutate()}
              disabled={!emailToAdd || addCollaboratorMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Add
            </Button>
          </div>
        </div>

        {/* Current Collaborators */}
        {(document.collaborators?.length > 0 || document.viewers?.length > 0) && (
          <div className="mb-6">
            <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
              <Users className="w-4 h-4" />
              People with access
            </label>
            <div className="space-y-2">
              {document.collaborators?.map((email) => (
                <div key={email} className="flex items-center justify-between p-2 glass-effect rounded-lg">
                  <span className="text-white text-sm">{email}</span>
                  <span className="text-xs text-green-400">Can edit</span>
                </div>
              ))}
              {document.viewers?.map((email) => (
                <div key={email} className="flex items-center justify-between p-2 glass-effect rounded-lg">
                  <span className="text-white text-sm">{email}</span>
                  <span className="text-xs text-gray-400">Can view</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Share Link */}
        <div className="border-t border-white/10 pt-6">
          <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Share link (expires in)
          </label>
          <div className="flex gap-2 mb-3">
            <select
              value={shareExpiry}
              onChange={(e) => setShareExpiry(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
            >
              <option value="1">1 hour</option>
              <option value="24">24 hours</option>
              <option value="168">7 days</option>
              <option value="720">30 days</option>
            </select>
            <Button
              onClick={() => generateShareLinkMutation.mutate()}
              disabled={generateShareLinkMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Generate Link
            </Button>
          </div>

          {shareLink && (
            <div className="p-3 bg-white/5 rounded-lg flex items-center gap-2">
              <code className="flex-1 text-sm text-purple-400 truncate">{shareLink}</code>
              <button
                onClick={() => copyToClipboard(shareLink)}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <Copy className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}
        </div>

        {document.share_token && document.share_expires_at && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-2">
            <Clock className="w-4 h-4 text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-300">
              Active share link expires on{' '}
              {new Date(document.share_expires_at).toLocaleString()}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
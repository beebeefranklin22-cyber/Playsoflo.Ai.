import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Users } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function CreateGroupChatModal({ currentUser, onClose, onCreated }) {
  const [groupName, setGroupName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [participants, setParticipants] = useState([currentUser.email]);
  const [creating, setCreating] = useState(false);

  const addParticipant = (e) => {
    e.preventDefault();
    const email = participantEmail.trim().toLowerCase();
    
    if (!email) return;
    if (participants.includes(email)) {
      toast.error('User already added');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Invalid email address');
      return;
    }

    setParticipants([...participants, email]);
    setParticipantEmail('');
    toast.success('Participant added');
  };

  const removeParticipant = (email) => {
    if (email === currentUser.email) {
      toast.error("You can't remove yourself");
      return;
    }
    setParticipants(participants.filter(p => p !== email));
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    if (participants.length < 2) {
      toast.error('Add at least one more participant');
      return;
    }

    setCreating(true);
    try {
      const conversation = await base44.entities.ChatConversation.create({
        participants,
        name: groupName.trim(),
        is_group: true,
        type: 'general',
        unread_count: {}
      });

      toast.success('Group chat created!');
      onCreated(conversation);
      onClose();
    } catch (error) {
      console.error('Failed to create group:', error);
      toast.error('Failed to create group chat');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-effect rounded-2xl p-6 border border-white/10"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Create Group Chat</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Group Name</label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Add Participants</label>
            <form onSubmit={addParticipant} className="flex gap-2">
              <Input
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
                placeholder="Enter email address..."
                className="bg-white/5 border-white/10 text-white"
              />
              <Button type="submit" variant="outline" className="border-white/20">
                Add
              </Button>
            </form>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-400">{participants.length} participant(s)</p>
            {participants.map((email) => (
              <div key={email} className="flex items-center justify-between p-3 glass-effect rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                    {email[0].toUpperCase()}
                  </div>
                  <span className="text-white text-sm">{email}</span>
                  {email === currentUser.email && (
                    <span className="text-xs text-gray-400">(You)</span>
                  )}
                </div>
                {email !== currentUser.email && (
                  <button
                    onClick={() => removeParticipant(email)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-white/20 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={createGroup}
              disabled={creating}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
            >
              {creating ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
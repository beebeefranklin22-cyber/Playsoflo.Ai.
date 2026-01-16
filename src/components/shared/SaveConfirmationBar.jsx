import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SaveConfirmationBar({ 
  isVisible, 
  onSave, 
  onCancel, 
  isSaving = false,
  message = "You have unsaved changes",
  description = "Save to apply your changes"
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-0 right-0 z-40 p-4"
        >
          <div className="max-w-4xl mx-auto glass-effect border border-purple-500/50 rounded-2xl p-4 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-semibold">{message}</p>
                <p className="text-gray-400 text-sm">{description}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={onCancel}
                variant="outline"
                className="bg-white/5 border-white/20 hover:bg-white/10"
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={onSave}
                className="bg-purple-600 hover:bg-purple-700"
                disabled={isSaving}
              >
                <Check className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
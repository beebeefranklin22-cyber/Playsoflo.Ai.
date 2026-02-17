import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function DeleteAccountModal({ isOpen, onClose, currentUser }) {
  const open = isOpen;
  const onOpenChange = onClose;
  const userEmail = currentUser?.email;
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast.error('Please type "DELETE" to confirm');
      return;
    }

    setIsDeleting(true);
    
    // Trigger warning haptic feedback
    if (window.NativeAppBridge?.triggerHaptic) {
      window.NativeAppBridge.triggerHaptic('heavy');
    }
    
    try {
      // Call the delete account function
      const response = await base44.functions.invoke('deleteUserAccount', {
        confirm: true
      });
      
      if (response.data?.success) {
        toast.success("✓ Account permanently deleted. Logging out...", {
          duration: 3000
        });
        
        // Success haptic
        if (window.NativeAppBridge?.triggerHaptic) {
          window.NativeAppBridge.triggerHaptic('success');
        }
        
        // Logout and redirect after showing success message
        setTimeout(() => {
          base44.auth.logout(window.location.origin);
        }, 2000);
      } else {
        throw new Error(response.data?.message || 'Account deletion failed');
      }
      
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error("Failed to delete account: " + (error.message || 'Unknown error'));
      
      // Error haptic
      if (window.NativeAppBridge?.triggerHaptic) {
        window.NativeAppBridge.triggerHaptic('error');
      }
      
      setIsDeleting(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setConfirmText("");
    setIsDeleting(false);
    onOpenChange(false);
  };

  if (step === 1) {
    return (
      <AlertDialog open={open} onOpenChange={resetAndClose}>
        <AlertDialogContent className="bg-gray-900 border-red-500/30">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <AlertDialogTitle className="text-2xl text-white">
                Delete Account?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-300 text-base space-y-3">
              <p className="font-semibold text-red-400">
                ⚠️ This action is PERMANENT and CANNOT be undone.
              </p>
              <p className="text-white font-medium">
                Deleting your account will immediately and permanently:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-4 my-3">
                <li><strong>Delete all your content:</strong> Posts, messages, photos, videos, and stories</li>
                <li><strong>Remove your profile:</strong> Name, email, bio, and all personal information</li>
                <li><strong>Cancel all bookings:</strong> Active reservations, tickets, and subscriptions</li>
                <li><strong>Clear your wallet:</strong> USD and SoFlo balances, payment methods, and transaction history</li>
                <li><strong>Remove social connections:</strong> Friends, followers, groups, and communities</li>
                <li><strong>Delete business data:</strong> Listings, services, reviews, and earnings</li>
              </ul>
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 my-3">
                <p className="text-yellow-300 font-semibold text-sm">
                  💡 You will be immediately logged out and your account email will be anonymized. This action cannot be reversed or recovered.
                </p>
              </div>
              <p className="text-white font-bold text-center">
                Are you absolutely sure you want to continue?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 hover:bg-gray-700 border-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setStep(2);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={resetAndClose}>
      <AlertDialogContent className="bg-gray-900 border-red-500/30">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <AlertDialogTitle className="text-2xl text-white">
              Final Confirmation
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-gray-300 text-base space-y-4">
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
              <p className="font-bold text-red-300 text-lg mb-2">
                ⚠️ FINAL WARNING - LAST CHANCE!
              </p>
              <p className="text-gray-300 text-sm mb-3">
                Once you click "Delete My Account", all your data will be permanently erased from our servers within seconds. There is no recovery, no backup, and no undo.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-white font-semibold mb-2">
                To confirm permanent deletion, type the word:
              </p>
              <p className="text-center text-2xl font-mono font-bold text-red-400 my-3">
                DELETE
              </p>
            </div>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE here (case sensitive)"
              className="bg-gray-800 border-red-500/30 text-white font-mono text-lg text-center"
              disabled={isDeleting}
              autoFocus
            />
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-sm text-gray-400">
                Account being deleted: <span className="text-white font-semibold">{userEmail}</span>
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            className="bg-gray-800 hover:bg-gray-700 border-gray-700"
            disabled={isDeleting}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={confirmText !== "DELETE" || isDeleting}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete My Account"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
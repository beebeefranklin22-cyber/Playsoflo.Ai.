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
    
    // Trigger haptic feedback
    if (window.NativeAppBridge?.triggerHaptic) {
      window.NativeAppBridge.triggerHaptic('heavy');
    }
    
    try {
      await base44.functions.invoke('deleteUserAccount', {
        confirm: true
      });
      
      toast.success("Account deleted successfully. Redirecting...");
      
      // Success haptic
      if (window.NativeAppBridge?.triggerHaptic) {
        window.NativeAppBridge.triggerHaptic('success');
      }
      
      // Wait a moment then logout and redirect
      setTimeout(() => {
        base44.auth.logout();
      }, 2000);
      
    } catch (error) {
      toast.error("Failed to delete account: " + error.message);
      
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
                This action is permanent and cannot be undone.
              </p>
              <p>
                Deleting your account will:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Permanently delete all your posts, messages, and content</li>
                <li>Remove your profile and account information</li>
                <li>Cancel any active subscriptions or bookings</li>
                <li>Delete all your wallet balance and transaction history</li>
                <li>Remove you from all groups and communities</li>
              </ul>
              <p className="text-yellow-400 font-medium mt-4">
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
            <p className="font-semibold text-red-400">
              Last chance to reconsider!
            </p>
            <p>
              Type <span className="font-mono font-bold text-white">DELETE</span> to permanently delete your account.
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE here"
              className="bg-gray-800 border-red-500/30 text-white font-mono"
              disabled={isDeleting}
            />
            <p className="text-sm text-gray-400">
              Deleting account: <span className="text-white font-semibold">{userEmail}</span>
            </p>
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
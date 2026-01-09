import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Car, CheckCircle, Upload, Shield, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BecomeDriverButton({ currentUser }) {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const becomeDriverMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({
        is_driver: true,
        driver_status: 'pending_verification'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['current-user']);
      toast.success('Welcome to the driver program! Complete verification to start earning.');
      setShowModal(false);
      navigate(createPageUrl("DriverHub"));
    }
  });

  if (currentUser?.is_driver) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
      >
        <Car className="w-4 h-4 mr-2" />
        Become a Driver
      </Button>

      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
              <h2 className="text-3xl font-bold text-white mb-2">Start Earning as a Driver</h2>
              <p className="text-green-100">Join thousands of drivers earning on their own schedule</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white/5 rounded-xl">
                  <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <h3 className="text-white font-bold mb-1">Earn More</h3>
                  <p className="text-gray-400 text-sm">Keep 90% of every fare</p>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-xl">
                  <Car className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <h3 className="text-white font-bold mb-1">Your Schedule</h3>
                  <p className="text-gray-400 text-sm">Drive whenever you want</p>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-xl">
                  <Shield className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <h3 className="text-white font-bold mb-1">Safe & Secure</h3>
                  <p className="text-gray-400 text-sm">Full insurance coverage</p>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                <h3 className="text-white font-bold mb-4">What's Required:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Valid driver's license</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Vehicle registration & insurance</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Background check (we'll help with this)</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Be 21 years or older</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setShowModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Not Now
                </Button>
                <Button
                  onClick={() => becomeDriverMutation.mutate()}
                  disabled={becomeDriverMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
                >
                  <Car className="w-4 h-4 mr-2" />
                  Join Now
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Trash2, AlertTriangle, Loader2, FileText, Shield } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function DataManagementModal({ currentUser, onClose }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      // Gather all user data
      const [services, bookings, reviews, portfolio, availability, verifications] = await Promise.all([
        base44.entities.MarketplaceItem.filter({ provider_email: currentUser.email }),
        base44.entities.ServiceBooking.filter({ provider_email: currentUser.email }),
        base44.entities.Rating.filter({ provider_email: currentUser.email }),
        base44.entities.PortfolioItem.filter({ user_email: currentUser.email }),
        base44.entities.ProviderAvailability.filter({ provider_email: currentUser.email }),
        base44.entities.ProviderVerification.filter({ provider_email: currentUser.email })
      ]);

      const exportData = {
        export_date: new Date().toISOString(),
        user_profile: {
          email: currentUser.email,
          full_name: currentUser.full_name,
          provider_business_name: currentUser.provider_business_name,
          provider_description: currentUser.provider_description,
          provider_trust_score: currentUser.provider_trust_score
        },
        services: services,
        bookings: bookings,
        reviews: reviews,
        portfolio: portfolio,
        availability: availability,
        verifications: verifications
      };

      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `provider-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE MY DATA') {
      toast.error('Please type "DELETE MY DATA" to confirm');
      return;
    }

    setDeleting(true);
    try {
      // Delete all provider data
      const [services, bookings, portfolio, availability, verifications] = await Promise.all([
        base44.entities.MarketplaceItem.filter({ provider_email: currentUser.email }),
        base44.entities.ServiceBooking.filter({ provider_email: currentUser.email }),
        base44.entities.PortfolioItem.filter({ user_email: currentUser.email }),
        base44.entities.ProviderAvailability.filter({ provider_email: currentUser.email }),
        base44.entities.ProviderVerification.filter({ provider_email: currentUser.email })
      ]);

      // Delete all entities
      await Promise.all([
        ...services.map(s => base44.entities.MarketplaceItem.delete(s.id)),
        ...portfolio.map(p => base44.entities.PortfolioItem.delete(p.id)),
        ...availability.map(a => base44.entities.ProviderAvailability.delete(a.id)),
        ...verifications.map(v => base44.entities.ProviderVerification.delete(v.id))
      ]);

      // Clear provider profile data
      await base44.auth.updateMe({
        is_provider: false,
        provider_business_name: null,
        provider_description: null,
        provider_logo_url: null,
        provider_trust_score: 0,
        provider_verification_level: 'none',
        stripe_account_id: null
      });

      toast.success('All provider data deleted successfully');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete data');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-gray-900 rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-400" />
              <h3 className="text-2xl font-bold text-white">Data Management</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Export Data */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Download className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-lg mb-2">Export Your Data</h4>
                    <p className="text-gray-400 text-sm mb-4">
                      Download all your provider data including services, bookings, reviews, and portfolio items in JSON format.
                    </p>
                    <Button
                      onClick={handleExportData}
                      disabled={exporting}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {exporting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Export Data
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delete Account */}
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-lg mb-2">Delete Provider Data</h4>
                    <p className="text-gray-400 text-sm mb-4">
                      Permanently delete all your provider data including services, portfolio, and availability. This action cannot be undone.
                    </p>

                    {!confirmDelete ? (
                      <Button
                        onClick={() => setConfirmDelete(true)}
                        variant="outline"
                        className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete My Provider Data
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                          <p className="text-red-300 text-sm font-semibold mb-2">
                            ⚠️ This will permanently delete:
                          </p>
                          <ul className="text-red-300 text-sm space-y-1 ml-4">
                            <li>• All your services and listings</li>
                            <li>• Your portfolio items</li>
                            <li>• Your availability settings</li>
                            <li>• Your verification records</li>
                            <li>• Your provider profile information</li>
                          </ul>
                        </div>

                        <div>
                          <label className="text-gray-300 text-sm block mb-2">
                            Type <span className="font-bold text-red-400">DELETE MY DATA</span> to confirm:
                          </label>
                          <input
                            type="text"
                            value={deleteText}
                            onChange={(e) => setDeleteText(e.target.value)}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-red-500"
                            placeholder="DELETE MY DATA"
                          />
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={handleDeleteAccount}
                            disabled={deleting || deleteText !== 'DELETE MY DATA'}
                            className="flex-1 bg-red-600 hover:bg-red-700"
                          >
                            {deleting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Confirm Delete
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => {
                              setConfirmDelete(false);
                              setDeleteText('');
                            }}
                            variant="outline"
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
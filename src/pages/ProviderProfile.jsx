import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Shield, CheckCircle, Award, Star, MapPin, Phone, 
  Globe, Calendar, TrendingUp, ChevronLeft, ExternalLink,
  Linkedin, Github, Twitter, Instagram, Edit, Camera, Trophy, X, Upload
} from "lucide-react";
import ReviewsList from "../components/reviews/ReviewsList";
import { motion, AnimatePresence } from "framer-motion";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { toast } from "sonner";
import PortfolioSection from "../components/profile/PortfolioSection";
import ProviderCalendarManager from "../components/provider/ProviderCalendarManager";
import DataManagementModal from "../components/provider/DataManagementModal";
import ProviderStorefront from "../components/booking/ProviderStorefront";

export default function ProviderProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [editData, setEditData] = useState({
    about_me: "",
    linkedin_url: "",
    github_url: "",
    twitter_url: "",
    instagram_url: "",
    portfolio_url: "",
    banner_image: ""
  });
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      setEditData({
        about_me: user.about_me || "",
        linkedin_url: user.linkedin_url || "",
        github_url: user.github_url || "",
        twitter_url: user.twitter_url || "",
        instagram_url: user.instagram_url || "",
        portfolio_url: user.portfolio_url || "",
        banner_image: user.banner_image || ""
      });
    }).catch(() => {});
  }, []);

  const { data: verifications = [] } = useQuery({
    queryKey: ["provider-verifications"],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.ProviderVerification.filter({ 
        provider_email: currentUser.email,
        status: "verified"
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: services = [] } = useQuery({
    queryKey: ["provider-services"],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.MarketplaceItem.filter({ 
        created_by: currentUser.email 
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: async () => {
      const updated = await base44.auth.me();
      setCurrentUser(updated);
      setEditData({
        about_me: updated.about_me || "",
        linkedin_url: updated.linkedin_url || "",
        github_url: updated.github_url || "",
        twitter_url: updated.twitter_url || "",
        instagram_url: updated.instagram_url || "",
        portfolio_url: updated.portfolio_url || "",
        banner_image: updated.banner_image || ""
      });
      setIsEditing(false);
      toast.success("Profile updated!");
    }
  });

  const handleBannerUpload = async (file) => {
    if (!file) return;
    setUploadingBanner(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await updateProfileMutation.mutateAsync({ banner_image: file_url });
    } catch (error) {
      toast.error("Failed to upload banner");
    } finally {
      setUploadingBanner(false);
    }
  };

  const verificationLevelColors = {
    none: "from-gray-500 to-gray-600",
    basic: "from-blue-500 to-blue-600",
    standard: "from-green-500 to-green-600",
    premium: "from-purple-500 to-purple-600",
    elite: "from-yellow-500 to-yellow-600"
  };

  return (
    <div className="min-h-screen p-6 pb-20">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition border border-white/20"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {/* Banner Section */}
        <div className="relative h-80 rounded-3xl overflow-hidden mb-6">
          {currentUser?.banner_image ? (
            <img 
              src={currentUser.banner_image} 
              alt="Banner" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${
              verificationLevelColors[currentUser?.provider_verification_level || "none"]
            }`} />
          )}
          <div className="absolute inset-0 bg-black/30" />
          
          {/* Banner Upload Button */}
          <input
            type="file"
            id="banner-upload"
            className="hidden"
            accept="image/*"
            onChange={(e) => handleBannerUpload(e.target.files?.[0])}
          />
          <button
            onClick={() => document.getElementById('banner-upload').click()}
            disabled={uploadingBanner}
            className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-3 rounded-full hover:bg-black/70 transition"
          >
            {uploadingBanner ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </button>

          {/* Profile Info Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-xl border-4 border-white/30">
                <div className="text-6xl font-bold text-white">
                  {currentUser?.provider_business_name?.[0] || currentUser?.full_name?.[0] || "P"}
                </div>
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {currentUser?.provider_business_name || currentUser?.full_name || "Provider"}
              </h1>
              {currentUser?.provider_verification_level !== "none" && (
                <div className="flex items-center justify-center gap-2">
                  <Shield className="w-6 h-6 text-white" />
                  <span className="text-white text-xl font-semibold uppercase">
                    {currentUser?.provider_verification_level} Verified Provider
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Edit Button */}
          <div className="absolute bottom-4 right-4 flex gap-3">
            <Button
              onClick={() => setShowDataManagement(true)}
              variant="outline"
              className="bg-white/10 border-white/20 hover:bg-white/20"
            >
              <Shield className="w-4 h-4 mr-2" />
              Data Management
            </Button>
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Trust Score Card */}
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-xl mb-2">Trust Score</h3>
                <p className="text-gray-400 text-sm">
                  Based on {verifications.length} verification{verifications.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-green-400 mb-2">
                  {currentUser?.provider_trust_score || 0}
                </div>
                <div className="text-gray-400 text-sm">/ 100</div>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="w-full bg-white/10 rounded-full h-3">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${currentUser?.provider_trust_score || 0}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About Me Section */}
        {currentUser?.about_me && (
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white">About Me</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="text-gray-300 prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: currentUser.about_me }}
              />
            </CardContent>
          </Card>
        )}

        {/* Social Media & Contact */}
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Connect With Me</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentUser?.provider_phone && (
              <div className="flex items-center gap-3 text-gray-300">
                <Phone className="w-5 h-5 text-purple-400" />
                <span>{currentUser.provider_phone}</span>
              </div>
            )}
            {currentUser?.provider_business_address && (
              <div className="flex items-center gap-3 text-gray-300">
                <MapPin className="w-5 h-5 text-red-400" />
                <span>{currentUser.provider_business_address}</span>
              </div>
            )}
            {currentUser?.provider_website && (
              <a 
                href={currentUser.provider_website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-blue-400 hover:text-blue-300 transition"
              >
                <Globe className="w-5 h-5" />
                <span>{currentUser.provider_website}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            
            {/* Social Links */}
            <div className="flex flex-wrap gap-3 pt-3 border-t border-white/10">
              {currentUser?.linkedin_url && (
                <a
                  href={currentUser.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-600/30 rounded-lg hover:bg-blue-600/30 transition"
                >
                  <Linkedin className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400 text-sm">LinkedIn</span>
                </a>
              )}
              {currentUser?.github_url && (
                <a
                  href={currentUser.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600/20 border border-gray-600/30 rounded-lg hover:bg-gray-600/30 transition"
                >
                  <Github className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400 text-sm">GitHub</span>
                </a>
              )}
              {currentUser?.twitter_url && (
                <a
                  href={currentUser.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-sky-600/20 border border-sky-600/30 rounded-lg hover:bg-sky-600/30 transition"
                >
                  <Twitter className="w-4 h-4 text-sky-400" />
                  <span className="text-sky-400 text-sm">Twitter</span>
                </a>
              )}
              {currentUser?.instagram_url && (
                <a
                  href={currentUser.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-pink-600/20 border border-pink-600/30 rounded-lg hover:bg-pink-600/30 transition"
                >
                  <Instagram className="w-4 h-4 text-pink-400" />
                  <span className="text-pink-400 text-sm">Instagram</span>
                </a>
              )}
              {currentUser?.portfolio_url && (
                <a
                  href={currentUser.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-600/30 rounded-lg hover:bg-purple-600/30 transition"
                >
                  <Globe className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-400 text-sm">Portfolio</span>
                </a>
              )}
            </div>

            {currentUser?.provider_years_experience && (
              <div className="flex items-center gap-3 text-gray-300 pt-3 border-t border-white/10">
                <Calendar className="w-5 h-5 text-yellow-400" />
                <span>{currentUser.provider_years_experience} years of experience</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verifications */}
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Award className="w-6 h-6 text-green-400" />
              Verified Credentials
            </CardTitle>
          </CardHeader>
          <CardContent>
            {verifications.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No verifications completed yet</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {verifications.map((verification, idx) => (
                  <motion.div
                    key={verification.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="text-white font-semibold capitalize mb-1">
                          {verification.verification_type.replace(/_/g, ' ')}
                        </h4>
                        {verification.license_number && (
                          <p className="text-gray-400 text-sm mb-1">
                            #{verification.license_number}
                          </p>
                        )}
                        {verification.issuing_authority && (
                          <p className="text-gray-400 text-sm">
                            {verification.issuing_authority}
                          </p>
                        )}
                        {verification.expiration_date && (
                          <p className="text-gray-500 text-xs mt-2">
                            Valid until {new Date(verification.expiration_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Storefront — visible to all visitors, booking flows for others */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Services & Products</h2>
          <ProviderStorefront
            providerEmail={currentUser?.email}
            provider={currentUser}
            currentUser={currentUser}
          />
        </div>

        {/* Portfolio Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Portfolio</h2>
          <PortfolioSection 
            userEmail={currentUser?.email} 
            isOwnProfile={true}
            currentUser={currentUser}
          />
        </div>

        {/* Availability Calendar */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">My Availability</h2>
          <ProviderCalendarManager currentUser={currentUser} />
        </div>

        {/* Customer Reviews */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Customer Reviews</h2>
          <ReviewsList providerEmail={currentUser?.email} />
        </div>

        {/* Services */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Services Offered</CardTitle>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No services listed yet</p>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {services.map((service) => (
                  <div key={service.id} className="relative group">
                    <div className="relative h-48 rounded-xl overflow-hidden bg-gray-900">
                      <img 
                        src={service.image_url} 
                        alt={service.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <h3 className="text-white font-bold mb-2">{service.title}</h3>
                        <div className="flex items-center justify-between">
                          <div className="text-white font-bold">
                            ${service.price}
                          </div>
                          {service.verified_provider && (
                            <Badge className="bg-green-500/30 text-green-200 border-0">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trust Indicators */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
            <Shield className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white mb-1">
              {verifications.length}
            </div>
            <div className="text-gray-400 text-sm">Verifications</div>
          </div>

          <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
            <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white mb-1">
              {services.reduce((sum, s) => sum + (s.rating || 0), 0) / services.length || 0}
            </div>
            <div className="text-gray-400 text-sm">Avg Rating</div>
          </div>

          <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
            <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white mb-1">
              {services.length}
            </div>
            <div className="text-gray-400 text-sm">Services</div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
            onClick={() => setIsEditing(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-gray-900 rounded-2xl p-6 my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Edit Profile</h3>
                <button onClick={() => setIsEditing(false)}>
                  <X className="w-6 h-6 text-gray-400 hover:text-white" />
                </button>
              </div>

              <div className="space-y-6">
                {/* About Me */}
                <div>
                  <label className="text-gray-400 text-sm mb-2 block font-medium">
                    About Me (Rich Text)
                  </label>
                  <div className="bg-white rounded-lg">
                    <ReactQuill
                      theme="snow"
                      value={editData.about_me}
                      onChange={(value) => setEditData({ ...editData, about_me: value })}
                      modules={{
                        toolbar: [
                          [{ header: [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ list: 'ordered' }, { list: 'bullet' }],
                          ['link'],
                          ['clean']
                        ]
                      }}
                      className="h-48"
                    />
                  </div>
                </div>

                {/* Social Media Links */}
                <div className="grid md:grid-cols-2 gap-4 pt-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                      <Linkedin className="w-4 h-4" />
                      LinkedIn URL
                    </label>
                    <Input
                      placeholder="https://linkedin.com/in/yourprofile"
                      value={editData.linkedin_url}
                      onChange={(e) => setEditData({ ...editData, linkedin_url: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                      <Github className="w-4 h-4" />
                      GitHub URL
                    </label>
                    <Input
                      placeholder="https://github.com/yourusername"
                      value={editData.github_url}
                      onChange={(e) => setEditData({ ...editData, github_url: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                      <Twitter className="w-4 h-4" />
                      Twitter URL
                    </label>
                    <Input
                      placeholder="https://twitter.com/yourusername"
                      value={editData.twitter_url}
                      onChange={(e) => setEditData({ ...editData, twitter_url: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                      <Instagram className="w-4 h-4" />
                      Instagram URL
                    </label>
                    <Input
                      placeholder="https://instagram.com/yourusername"
                      value={editData.instagram_url}
                      onChange={(e) => setEditData({ ...editData, instagram_url: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Portfolio Website
                    </label>
                    <Input
                      placeholder="https://yourportfolio.com"
                      value={editData.portfolio_url}
                      onChange={(e) => setEditData({ ...editData, portfolio_url: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 border-t border-white/10">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={() => updateProfileMutation.mutate(editData)}
                    disabled={updateProfileMutation.isLoading}
                  >
                    {updateProfileMutation.isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Management Modal */}
      {showDataManagement && (
        <DataManagementModal
          currentUser={currentUser}
          onClose={() => setShowDataManagement(false)}
        />
      )}
    </div>
  );
}
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Edit, Save, X, Award, Briefcase, Clock, MapPin } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AboutSection({ provider, isOwner = false }) {
  const [editing, setEditing] = useState(false);
  const [aboutText, setAboutText] = useState(provider?.about_us || '');
  const [specialties, setSpecialties] = useState(provider?.specialties || []);
  const [yearsExperience, setYearsExperience] = useState(provider?.years_experience || 0);
  const [serviceArea, setServiceArea] = useState(provider?.service_area || '');
  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.User.update(provider.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-profile']);
      toast.success('Profile updated successfully');
      setEditing(false);
    }
  });

  const handleSave = () => {
    updateProfileMutation.mutate({
      about_us: aboutText,
      specialties,
      years_experience: yearsExperience,
      service_area: serviceArea
    });
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            About {provider?.provider_business_name || provider?.full_name}
          </CardTitle>
          {isOwner && !editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="bg-white/5 border-white/20 text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {editing ? (
          <>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">About Your Business</label>
              <Textarea
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                placeholder="Tell customers about your experience, approach, and what makes your services unique..."
                rows={6}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Years of Experience</label>
                <Input
                  type="number"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(Number(e.target.value))}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Service Area</label>
                <Input
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  placeholder="e.g., Miami-Dade County"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Specialties (comma-separated)</label>
              <Input
                value={specialties.join(', ')}
                onChange={(e) => setSpecialties(e.target.value.split(',').map(s => s.trim()))}
                placeholder="e.g., Wedding Photography, Portrait, Commercial"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditing(false)}
                className="bg-white/5 border-white/20 text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {aboutText || 'No description yet'}
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              {yearsExperience > 0 && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <Clock className="w-6 h-6 text-purple-400 mb-2" />
                  <div className="text-2xl font-bold text-white">{yearsExperience}+</div>
                  <div className="text-gray-400 text-sm">Years Experience</div>
                </div>
              )}
              {serviceArea && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <MapPin className="w-6 h-6 text-blue-400 mb-2" />
                  <div className="text-white font-semibold">{serviceArea}</div>
                  <div className="text-gray-400 text-sm">Service Area</div>
                </div>
              )}
              {specialties.length > 0 && (
                <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
                  <Award className="w-6 h-6 text-pink-400 mb-2" />
                  <div className="text-white font-semibold">{specialties.length}</div>
                  <div className="text-gray-400 text-sm">Specialties</div>
                </div>
              )}
            </div>

            {specialties.length > 0 && (
              <div>
                <h4 className="text-white font-semibold mb-3">Specialties</h4>
                <div className="flex flex-wrap gap-2">
                  {specialties.map((specialty, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-sm"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
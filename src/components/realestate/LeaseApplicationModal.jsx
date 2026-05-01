import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { X, FileText, User, Briefcase, Home, Calendar } from "lucide-react";

export default function LeaseApplicationModal({ property, currentUser, onClose }) {
  const [form, setForm] = useState({
    applicant_name: currentUser?.full_name || "",
    phone: "",
    employment_status: "employed",
    monthly_income: "",
    employer_name: "",
    current_address: "",
    move_in_date: "",
    num_occupants: 1,
    has_pets: false,
    pet_details: "",
    credit_score: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) { toast.error("Please log in first"); return; }
    setSubmitting(true);
    await base44.entities.LeaseApplication.create({
      property_id: property.id,
      property_address: property.address || property.location,
      applicant_email: currentUser.email,
      applicant_name: form.applicant_name,
      phone: form.phone,
      employment_status: form.employment_status,
      monthly_income: parseFloat(form.monthly_income) || 0,
      employer_name: form.employer_name,
      current_address: form.current_address,
      move_in_date: form.move_in_date,
      num_occupants: parseInt(form.num_occupants) || 1,
      has_pets: form.has_pets,
      pet_details: form.pet_details,
      credit_score: form.credit_score ? parseInt(form.credit_score) : undefined,
      status: "pending",
    });
    setSubmitting(false);
    setSubmitted(true);
    toast.success("Application submitted! The landlord will review it shortly.");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-gray-900 rounded-t-3xl md:rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Rental Application</h2>
                <p className="text-gray-400 text-sm line-clamp-1">{property.title}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {submitted ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Application Submitted!</h3>
              <p className="text-gray-400 mb-6">The landlord will review your application and get back to you.</p>
              <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700">Close</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Personal Info */}
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-semibold text-sm">Personal Information</span>
              </div>
              <Input
                placeholder="Full Name *"
                value={form.applicant_name}
                onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
                required
                className="bg-white/10 border-white/20 text-white placeholder-gray-400"
              />
              <Input
                placeholder="Phone Number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder-gray-400"
              />
              <Input
                placeholder="Current Address"
                value={form.current_address}
                onChange={(e) => setForm({ ...form, current_address: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder-gray-400"
              />

              {/* Employment */}
              <div className="flex items-center gap-2 mt-4 mb-2">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-semibold text-sm">Employment & Income</span>
              </div>
              <select
                value={form.employment_status}
                onChange={(e) => setForm({ ...form, employment_status: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm"
              >
                <option value="employed">Employed</option>
                <option value="self_employed">Self-Employed</option>
                <option value="student">Student</option>
                <option value="retired">Retired</option>
                <option value="unemployed">Unemployed</option>
              </select>
              <Input
                placeholder="Employer / Company Name"
                value={form.employer_name}
                onChange={(e) => setForm({ ...form, employer_name: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder-gray-400"
              />
              <Input
                type="number"
                placeholder="Monthly Income ($) *"
                value={form.monthly_income}
                onChange={(e) => setForm({ ...form, monthly_income: e.target.value })}
                required
                className="bg-white/10 border-white/20 text-white placeholder-gray-400"
              />
              <Input
                type="number"
                placeholder="Credit Score (optional)"
                value={form.credit_score}
                onChange={(e) => setForm({ ...form, credit_score: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder-gray-400"
              />

              {/* Move-in Details */}
              <div className="flex items-center gap-2 mt-4 mb-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-semibold text-sm">Move-in Details</span>
              </div>
              <Input
                type="date"
                placeholder="Desired Move-in Date"
                value={form.move_in_date}
                onChange={(e) => setForm({ ...form, move_in_date: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder-gray-400"
              />
              <Input
                type="number"
                placeholder="Number of Occupants"
                value={form.num_occupants}
                onChange={(e) => setForm({ ...form, num_occupants: e.target.value })}
                min={1}
                className="bg-white/10 border-white/20 text-white placeholder-gray-400"
              />
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="has_pets"
                  checked={form.has_pets}
                  onChange={(e) => setForm({ ...form, has_pets: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="has_pets" className="text-gray-300 text-sm">I have pets</label>
              </div>
              {form.has_pets && (
                <Input
                  placeholder="Pet details (type, breed, size)"
                  value={form.pet_details}
                  onChange={(e) => setForm({ ...form, pet_details: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2"
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
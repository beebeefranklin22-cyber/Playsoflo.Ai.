import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, User, Phone, ChevronDown, ChevronUp, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

/**
 * "This ride is for someone else" section — mirrors Uber's flow.
 * Exposes: { isForSomeoneElse, recipientName, recipientPhone }
 */
export default function RideForSomeoneElse({ onChange }) {
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const toggle = (val) => {
    setEnabled(val);
    if (!val) {
      setName("");
      setPhone("");
      onChange({ isForSomeoneElse: false, recipientName: "", recipientPhone: "" });
    } else {
      onChange({ isForSomeoneElse: true, recipientName: name, recipientPhone: phone });
    }
  };

  const update = (field, value) => {
    const next = { name, phone, [field]: value };
    if (field === "name") setName(value);
    if (field === "phone") setPhone(value);
    onChange({ isForSomeoneElse: true, recipientName: next.name, recipientPhone: next.phone });
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => toggle(!enabled)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${enabled ? 'bg-purple-500/20' : 'bg-white/10'}`}>
            <Users className={`w-4 h-4 ${enabled ? 'text-purple-400' : 'text-gray-400'}`} />
          </div>
          <div className="text-left">
            <p className="text-white text-sm font-medium">Book for someone else</p>
            {enabled && name && (
              <p className="text-purple-300 text-xs">{name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={enabled}
            onCheckedChange={toggle}
            className="pointer-events-none"
          />
        </div>
      </button>

      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
              <p className="text-gray-400 text-xs">
                The driver will be informed this is a ride for another person. The passenger's name will be shown to them.
              </p>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <Input
                  placeholder="Passenger's name"
                  value={name}
                  onChange={(e) => update("name", e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 h-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <Input
                  placeholder="Passenger's phone number"
                  value={phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 h-9"
                  type="tel"
                />
              </div>
              {name && (
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <Users className="w-4 h-4 text-purple-400" />
                  <p className="text-purple-300 text-xs">
                    Driver will pick up <strong>{name}</strong>{phone ? ` • ${phone}` : ""}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
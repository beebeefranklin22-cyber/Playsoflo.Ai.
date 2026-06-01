import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building, Check, Loader2, Shield } from "lucide-react";

const QUICK_BANKS = ["Chase", "Bank of America", "Wells Fargo", "Citibank", "US Bank", "PNC", "Capital One", "TD Bank", "Truist"];

export default function ManualBankPaymentForm({ currentUser, onCancel, onSave, saving }) {
  const [form, setForm] = useState({
    account_type: "checking",
    bank_name: "",
    account_holder_name: currentUser?.full_name || "",
    routing_number: "",
    account_number: "",
    confirm_account_number: ""
  });

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-2 text-green-400 text-sm">
        <Shield className="w-4 h-4" /> Manual bank linking — no Link popup or bank picker
      </div>

      <div className="flex gap-2">
        {["checking", "savings", "business"].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => update("account_type", type)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${
              form.account_type === type ? "bg-green-500/20 text-green-300 border border-green-500/40" : "bg-white/5 text-gray-400 border border-white/10"
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div>
        <label className="text-gray-400 text-sm mb-1.5 block">Account Holder Name</label>
        <Input value={form.account_holder_name} onChange={(e) => update("account_holder_name", e.target.value)} placeholder="Full name on account" className="bg-white/10 border-white/20 text-white" />
      </div>

      <div>
        <label className="text-gray-400 text-sm mb-1.5 block">Bank Name</label>
        <Input value={form.bank_name} onChange={(e) => update("bank_name", e.target.value)} placeholder="Type your bank name" autoComplete="off" className="bg-white/10 border-white/20 text-white" />
        <div className="flex flex-wrap gap-2 mt-2">
          {QUICK_BANKS.map((bank) => (
            <button key={bank} type="button" onClick={() => update("bank_name", bank)} className="px-2.5 py-1 rounded-full bg-white/10 text-gray-300 text-xs hover:bg-white/20">
              {bank}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-gray-400 text-sm mb-1.5 block">Routing Number</label>
        <Input value={form.routing_number} onChange={(e) => update("routing_number", e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="9 digits" inputMode="numeric" className="bg-white/10 border-white/20 text-white" />
      </div>

      <div>
        <label className="text-gray-400 text-sm mb-1.5 block">Account Number</label>
        <Input value={form.account_number} onChange={(e) => update("account_number", e.target.value.replace(/\D/g, "").slice(0, 17))} placeholder="Enter full account number" inputMode="numeric" type="password" className="bg-white/10 border-white/20 text-white" />
      </div>

      <div>
        <label className="text-gray-400 text-sm mb-1.5 block">Confirm Account Number</label>
        <Input value={form.confirm_account_number} onChange={(e) => update("confirm_account_number", e.target.value.replace(/\D/g, "").slice(0, 17))} placeholder="Re-enter account number" inputMode="numeric" type="password" className="bg-white/10 border-white/20 text-white" />
      </div>

      <div className="flex gap-3">
        <Button type="button" onClick={onCancel} variant="outline" className="flex-1 border-white/20 text-white" disabled={saving}>Cancel</Button>
        <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Check className="w-4 h-4 mr-2" />Save Bank</>}
        </Button>
      </div>
    </form>
  );
}
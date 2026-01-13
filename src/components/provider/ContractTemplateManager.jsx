import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function ContractTemplateManager({ currentUser }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    template_name: "",
    terms_and_conditions: "",
    cancellation_policy: {
      type: "moderate",
      hours_before: 24,
      refund_percentage: 50,
      custom_text: ""
    },
    custom_clauses: [],
    requires_signature: true
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['service-contracts', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.ServiceContract.filter({
        provider_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const { data: myServices = [] } = useQuery({
    queryKey: ['my-services-contracts'],
    queryFn: () => base44.entities.MarketplaceItem.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceContract.create({
      ...data,
      provider_email: currentUser.email
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-contracts'] });
      setShowForm(false);
      resetForm();
      toast.success('Contract template created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceContract.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-contracts'] });
      setEditingId(null);
      toast.success('Contract updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ServiceContract.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-contracts'] });
      toast.success('Contract deleted');
    }
  });

  const resetForm = () => {
    setForm({
      template_name: "",
      terms_and_conditions: "",
      cancellation_policy: {
        type: "moderate",
        hours_before: 24,
        refund_percentage: 50,
        custom_text: ""
      },
      custom_clauses: [],
      requires_signature: true
    });
  };

  const addCustomClause = () => {
    setForm({
      ...form,
      custom_clauses: [...form.custom_clauses, { title: "", content: "" }]
    });
  };

  const updateClause = (index, field, value) => {
    const updated = [...form.custom_clauses];
    updated[index][field] = value;
    setForm({ ...form, custom_clauses: updated });
  };

  const removeClause = (index) => {
    setForm({
      ...form,
      custom_clauses: form.custom_clauses.filter((_, i) => i !== index)
    });
  };

  const cancellationPolicies = {
    flexible: "Free cancellation up to 24 hours before service. 100% refund.",
    moderate: "Free cancellation up to 48 hours before service. 50% refund within 48 hours.",
    strict: "Free cancellation up to 7 days before service. No refund after that.",
    non_refundable: "No refunds or cancellations allowed after booking."
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Service Contract Templates
          </CardTitle>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="bg-white/10 rounded-lg p-4 border border-white/20 space-y-4">
            <Input
              placeholder="Template Name (e.g., Standard Service Agreement)"
              value={form.template_name}
              onChange={(e) => setForm({ ...form, template_name: e.target.value })}
              className="bg-white/10 border-white/20 text-white"
            />

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Terms & Conditions</label>
              <Textarea
                placeholder="Enter your service terms and conditions..."
                value={form.terms_and_conditions}
                onChange={(e) => setForm({ ...form, terms_and_conditions: e.target.value })}
                className="bg-white/10 border-white/20 text-white min-h-[150px]"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Cancellation Policy</label>
              <Select
                value={form.cancellation_policy.type}
                onValueChange={(v) => setForm({
                  ...form,
                  cancellation_policy: {
                    ...form.cancellation_policy,
                    type: v,
                    custom_text: v === 'custom' ? form.cancellation_policy.custom_text : cancellationPolicies[v]
                  }
                })}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white mb-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flexible">Flexible - 24h free cancellation</SelectItem>
                  <SelectItem value="moderate">Moderate - 48h, 50% refund</SelectItem>
                  <SelectItem value="strict">Strict - 7 days notice</SelectItem>
                  <SelectItem value="non_refundable">Non-Refundable</SelectItem>
                  <SelectItem value="custom">Custom Policy</SelectItem>
                </SelectContent>
              </Select>
              {form.cancellation_policy.type === 'custom' && (
                <Textarea
                  placeholder="Write your custom cancellation policy..."
                  value={form.cancellation_policy.custom_text}
                  onChange={(e) => setForm({
                    ...form,
                    cancellation_policy: { ...form.cancellation_policy, custom_text: e.target.value }
                  })}
                  className="bg-white/10 border-white/20 text-white"
                />
              )}
              <p className="text-gray-400 text-xs mt-1">
                {cancellationPolicies[form.cancellation_policy.type]}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-400 text-sm">Custom Clauses</label>
                <Button size="sm" variant="outline" onClick={addCustomClause}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Clause
                </Button>
              </div>
              {form.custom_clauses.map((clause, idx) => (
                <div key={idx} className="bg-white/5 rounded-lg p-3 mb-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Clause Title"
                      value={clause.title}
                      onChange={(e) => updateClause(idx, 'title', e.target.value)}
                      className="bg-white/10 border-white/20 text-white flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeClause(idx)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Clause content..."
                    value={clause.content}
                    onChange={(e) => updateClause(idx, 'content', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    rows={2}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.template_name || !form.terms_and_conditions}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {contracts.length === 0 && !showForm && (
          <div className="text-center py-8 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No contract templates yet. Create your first one!</p>
          </div>
        )}

        {contracts.map((contract) => (
          <div key={contract.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
            {editingId === contract.id ? (
              <div className="space-y-3">
                <Input
                  value={contract.template_name}
                  onChange={(e) => updateMutation.mutate({
                    id: contract.id,
                    data: { template_name: e.target.value }
                  })}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Button onClick={() => setEditingId(null)} size="sm">
                  <Save className="w-3 h-3 mr-1" />
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-white font-semibold">{contract.template_name}</h4>
                    <p className="text-gray-400 text-sm mt-1">
                      {contract.terms_and_conditions.substring(0, 100)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={contract.is_active
                      ? 'bg-green-500/30 text-green-300'
                      : 'bg-gray-500/30 text-gray-300'
                    }>
                      {contract.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div className="bg-white/5 rounded p-2 mb-3">
                  <p className="text-xs text-gray-400 mb-1">Cancellation Policy:</p>
                  <p className="text-white text-sm">
                    {contract.cancellation_policy?.type?.toUpperCase()} - {
                      cancellationPolicies[contract.cancellation_policy?.type] ||
                      contract.cancellation_policy?.custom_text
                    }
                  </p>
                </div>

                {contract.custom_clauses?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-1">{contract.custom_clauses.length} Custom Clauses</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(contract.id)}
                    className="flex-1"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(contract.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
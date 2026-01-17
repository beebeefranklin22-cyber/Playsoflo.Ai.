import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Upload, File, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function DocumentStorage({ propertyId, leaseId }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState("other");
  const [documentName, setDocumentName] = useState("");
  const [notes, setNotes] = useState("");

  const { data: documents = [] } = useQuery({
    queryKey: ['lease-documents', propertyId, leaseId],
    queryFn: async () => {
      const query = leaseId 
        ? { lease_id: leaseId }
        : { property_id: propertyId };
      return await base44.entities.LeaseDocument.filter(query);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LeaseDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease-documents'] });
      toast.success('Document deleted');
    }
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.LeaseDocument.create({
        property_id: propertyId,
        lease_id: leaseId || null,
        document_type: documentType,
        document_name: documentName || file.name,
        document_url: result.file_url,
        file_size: file.size,
        notes
      });

      queryClient.invalidateQueries({ queryKey: ['lease-documents'] });
      toast.success('Document uploaded');
      setDocumentName("");
      setNotes("");
      setDocumentType("other");
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">Upload Document</h3>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-white text-sm mb-2 block">Document Type</label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lease_agreement">Lease Agreement</SelectItem>
                  <SelectItem value="addendum">Addendum</SelectItem>
                  <SelectItem value="inspection_report">Inspection Report</SelectItem>
                  <SelectItem value="insurance_certificate">Insurance Certificate</SelectItem>
                  <SelectItem value="utility_bill">Utility Bill</SelectItem>
                  <SelectItem value="repair_invoice">Repair Invoice</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">Document Name</label>
              <Input
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Leave empty to use file name"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-white text-sm mb-2 block">Notes (Optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this document..."
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <label className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer transition">
            <Upload className="w-5 h-5 text-white" />
            <span className="text-white font-semibold">
              {uploading ? 'Uploading...' : 'Choose File to Upload'}
            </span>
            <input
              type="file"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {documents.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-white">Documents ({documents.length})</h3>
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <File className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{doc.document_name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span>{new Date(doc.created_date).toLocaleDateString()}</span>
                  </div>
                  {doc.notes && (
                    <p className="text-gray-400 text-xs mt-1 truncate">{doc.notes}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => window.open(doc.document_url, '_blank')}
                  size="sm"
                  variant="outline"
                  className="border-emerald-500 text-emerald-400"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => deleteMutation.mutate(doc.id)}
                  size="sm"
                  variant="outline"
                  className="border-red-500 text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
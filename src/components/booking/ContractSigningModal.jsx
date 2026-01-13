import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { FileText, CheckCircle, X, Pen } from "lucide-react";
import { toast } from "sonner";

export default function ContractSigningModal({ contract, onSign, onDecline, customerName }) {
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    setIsDrawing(true);
    ctx.beginPath();
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData(null);
    }
  };

  const handleSign = () => {
    if (!agreed) {
      toast.error('Please agree to the terms before signing');
      return;
    }

    if (contract.requires_signature && !signatureData) {
      toast.error('Please sign the document');
      return;
    }

    onSign({
      signature: signatureData,
      acceptance_method: contract.requires_signature ? 'signature' : 'checkbox'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-3xl w-full my-8"
      >
        <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Service Agreement
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDecline}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Terms Display */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-h-[300px] overflow-y-auto">
              <h3 className="text-white font-semibold mb-3">{contract.template_name}</h3>
              
              <div className="space-y-4 text-gray-300 text-sm">
                <div>
                  <h4 className="text-white font-medium mb-2">Terms & Conditions</h4>
                  <p className="whitespace-pre-wrap">{contract.terms_and_conditions}</p>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-2">Cancellation Policy</h4>
                  <p>
                    <strong className="text-yellow-400">{contract.cancellation_policy?.type?.toUpperCase()}</strong>
                    {' - '}
                    {contract.cancellation_policy?.custom_text || 
                     `Cancel up to ${contract.cancellation_policy?.hours_before}h before for ${contract.cancellation_policy?.refund_percentage}% refund`}
                  </p>
                </div>

                {contract.custom_clauses?.map((clause, idx) => (
                  <div key={idx}>
                    <h4 className="text-white font-medium mb-2">{clause.title}</h4>
                    <p>{clause.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Agreement Checkbox */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={agreed}
                  onCheckedChange={setAgreed}
                  className="mt-1"
                />
                <label className="text-white text-sm cursor-pointer" onClick={() => setAgreed(!agreed)}>
                  I have read and agree to the terms and conditions, cancellation policy, and all clauses outlined in this service agreement.
                </label>
              </div>
            </div>

            {/* Digital Signature */}
            {contract.requires_signature && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-white font-medium">Digital Signature</label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearSignature}
                    disabled={!signatureData}
                  >
                    Clear
                  </Button>
                </div>
                <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full cursor-crosshair"
                    style={{ touchAction: 'none' }}
                  />
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Pen className="w-4 h-4" />
                  <span>Draw your signature above</span>
                </div>
                <p className="text-white text-sm">
                  Signed by: <strong>{customerName}</strong>
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleSign}
                disabled={!agreed || (contract.requires_signature && !signatureData) || signing}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Sign & Accept Agreement
              </Button>
              <Button
                variant="outline"
                onClick={onDecline}
                className="bg-white/5"
              >
                Decline
              </Button>
            </div>

            <p className="text-gray-400 text-xs text-center">
              By signing, you agree that this digital signature is legally binding and has the same effect as a handwritten signature.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
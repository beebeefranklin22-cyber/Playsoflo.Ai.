import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Camera, Upload, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function ProofOfDeliveryModal({ delivery, onComplete, onClose }) {
  const [step, setStep] = useState(1);
  const [deliveryPhoto, setDeliveryPhoto] = useState(null);
  const [signature, setSignature] = useState(null);
  const [uploading, setUploading] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDeliveryPhoto(file_url);
      toast.success("Photo uploaded!");
      setStep(2);
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    setIsDrawing(true);
    ctx.beginPath();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    setSignature(canvas.toDataURL());
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  };

  const handleComplete = async () => {
    if (!deliveryPhoto && delivery.signature_required && !signature) {
      toast.error("Please provide photo and signature");
      return;
    }

    setUploading(true);
    try {
      await onComplete({
        delivery_photo: deliveryPhoto,
        signature_image: signature,
        proof_of_delivery_time: new Date().toISOString()
      });
      toast.success("✅ Proof of delivery submitted!");
      onClose();
    } catch (error) {
      toast.error("Failed to submit proof");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-gray-900 rounded-3xl border border-white/10"
      >
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 border-b border-white/10 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Proof of Delivery</h2>
              <p className="text-green-100 text-sm">Order #{delivery.order_number?.substring(0, 8)}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Photo */}
          {step === 1 && (
            <div>
              <h3 className="text-white font-bold mb-4">1. Take a photo of the delivered package</h3>
              
              {deliveryPhoto ? (
                <div className="relative">
                  <img src={deliveryPhoto} className="w-full h-64 object-cover rounded-xl" />
                  <button
                    onClick={() => setDeliveryPhoto(null)}
                    className="absolute top-2 right-2 p-2 bg-red-500 rounded-full"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    id="delivery-photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                    className="hidden"
                  />
                  <button
                    onClick={() => document.getElementById('delivery-photo').click()}
                    disabled={uploading}
                    className="w-full h-64 bg-white/10 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center hover:bg-white/20 transition"
                  >
                    {uploading ? (
                      <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-3" />
                    ) : (
                      <Camera className="w-12 h-12 text-gray-400 mb-3" />
                    )}
                    <p className="text-white font-semibold">
                      {uploading ? 'Uploading...' : 'Take Photo'}
                    </p>
                  </button>
                </>
              )}

              {deliveryPhoto && (
                <Button
                  onClick={() => setStep(2)}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  Next: {delivery.signature_required ? 'Get Signature' : 'Complete'}
                </Button>
              )}
            </div>
          )}

          {/* Step 2: Signature (if required) */}
          {step === 2 && delivery.signature_required && (
            <div>
              <h3 className="text-white font-bold mb-4">2. Get recipient signature</h3>
              
              <div className="bg-white rounded-xl p-4">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    startDrawing({ clientX: touch.clientX, clientY: touch.clientY });
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    draw({ clientX: touch.clientX, clientY: touch.clientY });
                  }}
                  onTouchEnd={stopDrawing}
                  className="border-2 border-gray-300 rounded-lg w-full cursor-crosshair touch-none"
                  style={{ touchAction: 'none' }}
                />
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSignature}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                  <p className="text-gray-600 text-xs flex items-center">Sign above</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={!signature || uploading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {uploading ? 'Submitting...' : 'Complete Delivery'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 (No Signature): Just Complete */}
          {step === 2 && !delivery.signature_required && (
            <div>
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-white font-bold text-xl mb-2">Ready to Complete?</h3>
                <p className="text-gray-400">Confirm the package has been delivered</p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={uploading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {uploading ? 'Submitting...' : 'Complete Delivery'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
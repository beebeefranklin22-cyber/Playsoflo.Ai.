import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, Flashlight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const scannedRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (!cameras || cameras.length === 0) {
          setError("No camera found on this device.");
          return;
        }
        // Prefer back camera on mobile
        const cam = cameras.find(c => /back|rear|environment/i.test(c.label)) || cameras[cameras.length - 1];
        setScanning(true);
        return scanner.start(
          cam.id,
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            if (!scannedRef.current) {
              scannedRef.current = true;
              scanner.stop().catch(() => {});
              onScan(decodedText);
            }
          },
          () => {} // ignore decode errors
        );
      })
      .catch((err) => {
        setError("Camera access denied. Please allow camera permissions.");
        console.error(err);
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white">
          <Camera className="w-5 h-5 text-purple-400" />
          <span className="font-semibold text-lg">Scan Barcode / QR</span>
        </div>
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Scanner Area */}
      <div className="w-full max-w-sm bg-black rounded-2xl overflow-hidden border border-white/20 relative">
        <div id="qr-reader" className="w-full" />

        {/* Scanning overlay guide */}
        {scanning && !error && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-36 border-2 border-purple-400 rounded-xl relative">
              <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-purple-400 rounded-tl" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-purple-400 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-purple-400 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-purple-400 rounded-br" />
              {/* Scanning line animation */}
              <div className="absolute inset-x-2 top-1/2 h-0.5 bg-purple-400/60 animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {error ? (
        <div className="mt-4 text-red-400 text-center text-sm px-4">{error}</div>
      ) : (
        <p className="mt-4 text-gray-400 text-sm text-center">
          Point your camera at a barcode or QR code
        </p>
      )}

      <Button
        onClick={onClose}
        variant="outline"
        className="mt-6 border-white/20 text-white hover:bg-white/10"
      >
        Cancel
      </Button>
    </div>
  );
}
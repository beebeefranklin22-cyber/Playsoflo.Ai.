import { motion } from "framer-motion";
import { X, FileText, Play } from "lucide-react";

export default function PropertyMediaViewer({ property, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">{property.title} — Media</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Floor Plan */}
          {property.floor_plan_url && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-white font-semibold">Floor Plan</h3>
              </div>
              <img
                src={property.floor_plan_url}
                alt="Floor Plan"
                className="w-full rounded-xl object-contain max-h-[400px] bg-white/5"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <a
                href={property.floor_plan_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden mt-2 text-blue-400 hover:underline text-sm"
              >
                Open Floor Plan →
              </a>
            </div>
          )}

          {/* Walkthrough Video */}
          {property.walkthrough_video_url && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Play className="w-5 h-5 text-emerald-400" />
                <h3 className="text-white font-semibold">Walkthrough Video</h3>
              </div>
              {property.walkthrough_video_url.includes("youtube.com") || property.walkthrough_video_url.includes("youtu.be") ? (
                <iframe
                  src={property.walkthrough_video_url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                  className="w-full aspect-video rounded-xl"
                  allowFullScreen
                  title="Walkthrough Video"
                />
              ) : (
                <video
                  src={property.walkthrough_video_url}
                  controls
                  className="w-full rounded-xl max-h-[400px]"
                />
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
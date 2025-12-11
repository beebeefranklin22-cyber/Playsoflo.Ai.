import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Brain, X, Send, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FleetAIAssistant({ open, onClose, fleetData }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi! I'm your Fleet AI Assistant. I can help you with:\n\n• Booking management and customer inquiries\n• Fleet allocation optimization\n• Pricing strategies\n• Maintenance scheduling\n• Performance analysis\n• Dispute resolution\n\nWhat can I help you with today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const context = `
FLEET CONTEXT:
- Total vehicles: ${fleetData.totalVehicles}
- Available: ${fleetData.available}
- Rented: ${fleetData.rented}
- Maintenance: ${fleetData.maintenance}
- Total revenue: $${fleetData.totalRevenue}
- Active rentals: ${fleetData.activeRentals}
- Average utilization: ${fleetData.utilizationRate}%

Recent bookings and issues:
${JSON.stringify(fleetData.recentBookings || [])}
${JSON.stringify(fleetData.pendingDisputes || [])}

USER QUESTION: ${userMessage}

As a fleet management AI assistant, provide helpful, actionable advice. Be specific and data-driven.
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: context,
        add_context_from_internet: false
      });

      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("AI Assistant error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I apologize, but I encountered an error processing your request. Please try again or rephrase your question." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = fleetData ? [
    "How can I increase my utilization rate?",
    "What pricing should I set for peak season?",
    "Help me resolve a damage dispute",
    "When should I schedule maintenance?",
    "Analyze my fleet performance"
  ] : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              Fleet AI Assistant
            </DialogTitle>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-gray-100'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <Sparkles className="w-4 h-4 text-purple-400 mb-2" />
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-2xl p-4">
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {messages.length === 1 && (
          <div className="pb-4">
            <p className="text-gray-400 text-sm mb-3">Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(action);
                    setTimeout(() => handleSend(), 100);
                  }}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t border-white/10">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about your fleet..."
            className="flex-1 bg-white/10 border-white/20 text-white"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
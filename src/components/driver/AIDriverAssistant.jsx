import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Brain, Send, X, Loader2, MapPin, DollarSign, Clock, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AIDriverAssistant({ open, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi! I'm your AI driving assistant. I can help you with:\n\n• Route optimization tips\n• Earnings strategies\n• Ride acceptance advice\n• Traffic updates\n• Platform policies\n• Vehicle maintenance reminders\n\nHow can I assist you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI assistant for rideshare drivers on the PlaySoFlo platform. 
        
Platform details:
- Drivers keep 88-90% of fares (industry-leading)
- $18/hour guaranteed minimum wage
- Instant cash-out available
- Tips: 100% goes to driver
- Peak hours: 7-9am, 5-7pm weekdays (1.5x multiplier)
- Streak bonuses: $5 per 10 rides without cancellation

Provide helpful, concise, and friendly advice for drivers. Focus on:
- Maximizing earnings
- Route optimization
- Time management
- Safety tips
- Platform features

Driver question: ${userMessage}

Provide a helpful response in 2-3 sentences max.`,
      });

      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("AI Assistant error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I apologize, but I encountered an error processing your question. Please try rephrasing or ask something else." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-400" />
              AI Driving Assistant
            </DialogTitle>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-purple-400" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white/10 text-gray-200'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              </div>
              <div className="bg-white/10 rounded-2xl px-4 py-3">
                <p className="text-sm text-gray-400">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 py-3 border-t border-white/10">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setInput("What's the best time to drive today?");
              setTimeout(() => handleSend(), 100);
            }}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <Clock className="w-3 h-3 mr-1" />
            Best times
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setInput("How can I maximize my earnings?");
              setTimeout(() => handleSend(), 100);
            }}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <DollarSign className="w-3 h-3 mr-1" />
            Earn more
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setInput("What areas have high demand right now?");
              setTimeout(() => handleSend(), 100);
            }}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <MapPin className="w-3 h-3 mr-1" />
            Hot zones
          </Button>
        </div>

        {/* Input */}
        <div className="flex gap-2 pt-3 border-t border-white/10">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything about driving..."
            className="flex-1 bg-white/10 border-white/20 text-white"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
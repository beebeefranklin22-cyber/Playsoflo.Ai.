import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Brain, Send, X, Loader2, MapPin, DollarSign, Clock, AlertTriangle, TrendingUp, Zap, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export default function AIDriverAssistant({ open, onClose, currentUser }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi! I'm your AI driving assistant with predictive intelligence. I can help you with:\n\n• 🔮 Demand forecasting & hot zones\n• 🗺️ Optimal route suggestions\n• 💰 Dynamic pricing recommendations\n• 📊 Performance analytics & tips\n• 🚗 Real-time traffic updates\n• 🎯 Personalized earning strategies\n\nHow can I assist you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && !insights && currentUser) {
      loadPredictiveInsights();
    }
  }, [open, currentUser]);

  const loadPredictiveInsights = async () => {
    if (!currentUser) return;
    
    setLoadingInsights(true);
    try {
      const location = currentUser.driver_current_lat 
        ? [currentUser.driver_current_lat, currentUser.driver_current_lng]
        : null;
      
      const { data } = await base44.functions.invoke('getPredictiveInsights', {
        driver_email: currentUser.email,
        current_location: location,
        time_of_day: new Date().getHours()
      });
      
      setInsights(data.insights);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

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
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-400 animate-pulse" />
              AI Predictive Assistant
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={loadPredictiveInsights}
                disabled={loadingInsights}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Zap className="w-3 h-3 mr-1" />
                Refresh Insights
              </Button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Predictive Insights Dashboard */}
        {loadingInsights ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-400">Analyzing patterns and generating insights...</p>
          </div>
        ) : insights ? (
          <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-white/5 rounded-xl max-h-64 overflow-y-auto">
            {/* Demand Forecast */}
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Demand Forecast
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Current:</span>
                  <Badge className={`
                    ${insights.demand_forecast?.current_demand === 'surge' ? 'bg-red-500/30 text-red-200' : ''}
                    ${insights.demand_forecast?.current_demand === 'high' ? 'bg-orange-500/30 text-orange-200' : ''}
                    ${insights.demand_forecast?.current_demand === 'medium' ? 'bg-yellow-500/30 text-yellow-200' : ''}
                    ${insights.demand_forecast?.current_demand === 'low' ? 'bg-gray-500/30 text-gray-200' : ''}
                  `}>
                    {insights.demand_forecast?.current_demand?.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-gray-400 text-xs">{insights.demand_forecast?.next_hour_prediction}</p>
                {insights.demand_forecast?.peak_hours_today?.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Peak Hours Today:</p>
                    <div className="flex flex-wrap gap-1">
                      {insights.demand_forecast.peak_hours_today.map((hour, idx) => (
                        <Badge key={idx} className="bg-green-500/20 text-green-300 text-xs">
                          {hour}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hot Zones */}
            {insights.demand_forecast?.high_demand_areas?.length > 0 && (
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-xl p-4">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Hot Zones
                </h3>
                <div className="space-y-2">
                  {insights.demand_forecast.high_demand_areas.slice(0, 3).map((area, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="text-white font-medium">{area.area_name}</p>
                      <p className="text-gray-400 text-xs">{area.distance_from_driver} • {area.demand_level}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Route Suggestions */}
            {insights.route_suggestions?.length > 0 && (
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Best Routes
                </h3>
                <div className="space-y-2">
                  {insights.route_suggestions.slice(0, 2).map((route, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="text-white font-medium">{route.destination}</p>
                      <p className="text-gray-400 text-xs">{route.reason}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-green-500/30 text-green-200 text-xs">
                          ${route.avg_fare}/ride
                        </Badge>
                        <Badge className="bg-blue-500/30 text-blue-200 text-xs">
                          {route.estimated_rides_per_hour} rides/hr
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Feedback */}
            {insights.performance_feedback && (
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Performance Score
                </h3>
                <div className="text-center mb-3">
                  <div className="text-4xl font-bold text-white">{insights.performance_feedback.overall_score}/100</div>
                </div>
                {insights.performance_feedback.earning_optimization_tips?.length > 0 && (
                  <div className="space-y-1">
                    {insights.performance_feedback.earning_optimization_tips.slice(0, 2).map((tip, idx) => (
                      <p key={idx} className="text-gray-300 text-xs">• {tip}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

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
              setInput("What's the predicted demand for the next 2 hours?");
              setTimeout(() => handleSend(), 100);
            }}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <TrendingUp className="w-3 h-3 mr-1" />
            Demand Forecast
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setInput("What's the optimal pricing strategy right now?");
              setTimeout(() => handleSend(), 100);
            }}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <DollarSign className="w-3 h-3 mr-1" />
            Pricing Tips
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setInput("Where should I position myself for maximum earnings?");
              setTimeout(() => handleSend(), 100);
            }}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <MapPin className="w-3 h-3 mr-1" />
            Best Position
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setInput("Analyze my performance and give me tips to earn more");
              setTimeout(() => handleSend(), 100);
            }}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <Target className="w-3 h-3 mr-1" />
            Performance
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
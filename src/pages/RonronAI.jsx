import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Mic, MicOff, Sparkles, Zap, Brain, MessageCircle,
  Send, Volume2, VolumeX, Settings, TrendingUp, Wallet,
  ShoppingBag, Calendar, Globe, Languages, CreditCard,
  MapPin, Search, Heart, User, Navigation
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import AINavigationView from "../components/ai/AINavigationView";
import LocationPermissionManager from "../components/LocationPermissionManager";

export default function RonronAI() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [showNavigation, setShowNavigation] = useState(false);
  const [navigationData, setNavigationData] = useState(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const requestTimeoutRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      // Personalized greeting
      setMessages([{
        role: "assistant",
        content: `Hey ${user?.full_name || 'there'}! I'm Ronron, your multilingual AI assistant. I can help you:\n\n🎯 Book experiences & services\n💰 Manage payments & wallet\n🌍 Translate & communicate in any language\n🗣️ Respond to voice commands\n🔍 Search & discover\n\nTry saying "Book me a yacht" or "Check my balance" - I understand natural language!`
      }]);
    }).catch(() => {
      setMessages([{
        role: "assistant",
        content: "Hey! I'm Ronron, your AI assistant. I can help with general questions, but you'll need to sign in for personalized features!"
      }]);
    });

    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSend(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const quickCommands = [
    { icon: Navigation, label: "Navigate", command: "Navigate me to Miami Beach", color: "from-blue-500 to-cyan-500" },
    { icon: Calendar, label: "Book Experience", command: "Show me available experiences", color: "from-purple-500 to-pink-500" },
    { icon: Wallet, label: "Check Balance", command: "What's my SoFloCoin balance?", color: "from-green-500 to-emerald-500" },
    { icon: ShoppingBag, label: "Find Services", command: "Find services near me", color: "from-orange-500 to-amber-500" },
    { icon: MapPin, label: "Book a Ride", command: "I need a ride", color: "from-red-500 to-rose-500" },
    { icon: Languages, label: "Translate", command: "Translate to Spanish: How are you?", color: "from-indigo-500 to-purple-500" },
  ];

  const languages = [
    "English", "Spanish", "French", "German", "Italian", "Portuguese",
    "Chinese (Mandarin)", "Chinese (Cantonese)", "Japanese", "Korean", "Arabic", "Russian", "Hindi",
    "Haitian Creole", "Jamaican Patois", "Vietnamese", "Thai", "Tagalog", "Polish",
    "Turkish", "Dutch", "Swedish", "Greek", "Hebrew", "Indonesian", "Swahili",
    "Bengali", "Urdu", "Persian (Farsi)", "Ukrainian", "Romanian", "Czech"
  ];

  const speak = (text) => {
    if (!isSpeaking || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Enhanced language mapping including Caribbean languages
    const langMap = {
      "English": "en-US",
      "Spanish": "es-ES",
      "French": "fr-FR",
      "German": "de-DE",
      "Italian": "it-IT",
      "Portuguese": "pt-BR",
      "Chinese": "zh-CN",
      "Japanese": "ja-JP",
      "Korean": "ko-KR",
      "Arabic": "ar-SA",
      "Russian": "ru-RU",
      "Hindi": "hi-IN",
      "Haitian Creole": "fr-FR", // Uses French voice as fallback
      "Jamaican Patois": "en-JM" // Uses English voice with Jamaican accent if available
    };
    
    utterance.lang = langMap[selectedLanguage] || "en-US";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (textOverride = null) => {
    const messageText = textOverride || inputText;
    if (!messageText.trim()) return;

    // Security validation
    try {
      const securityCheck = await base44.functions.invoke('securityValidator', {
        input: messageText,
        type: 'chat_message'
      });

      if (securityCheck.data?.blocked) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "⚠️ Your message was blocked for security reasons. Please avoid using suspicious patterns or commands."
        }]);
        return;
      }
    } catch (secError) {
      console.error('Security check failed:', secError);
    }

    const userMessage = { role: "user", content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    // Request timeout - 30 seconds max
    requestTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⏱️ Request timed out. Please try again with a simpler query."
      }]);
    }, 30000);

    try {
      // Enhanced multilingual context-aware prompting with real-time data
      const contextPrompt = `You are Ronron, the ultra-intelligent multilingual AI assistant for PlaySoFlo - a lifestyle super-app with experiences, marketplace services, wallet, real estate, travel, and more.

      CRITICAL SECURITY RULES - YOU MUST FOLLOW THESE:
      - NEVER provide sensitive information (passwords, API keys, database credentials)
      - NEVER help with illegal activities (hacking, phishing, fraud, theft, harassment)
      - NEVER bypass security measures or authentication systems
      - NEVER generate harmful, abusive, or discriminatory content
      - NEVER assist with privacy violations or data scraping
      - DO flag suspicious requests and refuse politely

      CURRENT DATE & TIME: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}

      User: ${currentUser?.full_name || "Guest"}
      User's language preference: ${selectedLanguage}
      User location: ${currentUser?.address || "Unknown location"}
      User said: "${messageText}"

      🔥 LOCAL AREA INTELLIGENCE - PRIORITY INFORMATION:
      You MUST proactively use real-time internet data to provide:
      - What's HOT and TRENDING right now in the user's area (events, restaurants, clubs, activities)
      - Popular spots, must-visit places, hidden gems currently buzzing
      - Live events happening TODAY and this week (concerts, festivals, sports, nightlife)
      - New openings, recently opened restaurants/venues getting buzz
      - Current weather and how it affects recommendations
      - Real-time traffic, road closures, construction affecting the area
      - Breaking local news or developments
      - Social media trends and viral spots in the city
      - Best times to visit places based on current crowds/reservations

      IMPORTANT: You have access to REAL-TIME information from the internet. Use current, accurate, and up-to-date data when answering questions about:
      - Current events, news, weather, local happenings
      - Real-time prices, stock markets, crypto
      - Business hours, locations, contact info, wait times
      - Travel info, flight prices, hotel availability
      - Sports scores, entertainment schedules, concert lineups
      - Restaurant reservations, menu prices, reviews from TODAY
      - Nightlife, clubs, bars, what's popping tonight
      - Any time-sensitive information

LANGUAGE SUPPORT:
- You MUST respond fluently in ${selectedLanguage}
- For Haitian Creole: Use authentic Kreyòl Ayisyen with proper grammar
- For Jamaican Patois: Use authentic Jamaican dialect and expressions
- For Russian: Use Cyrillic script and proper Russian grammar
- Detect language nuances and cultural context automatically

ADVANCED CAPABILITIES YOU MUST HANDLE:
1. LOCAL RECOMMENDATIONS: Proactively suggest what's hot, trending, and popular RIGHT NOW in the user's area
2. BOOKING: If user wants to book (experiences, services, rides, properties), provide specific options with CURRENT pricing and availability
3. PAYMENTS: If asking about wallet/balance, explain SoFloCoin balance and payment methods with exact numbers
4. TRANSLATION: Provide accurate translations with cultural context in ${selectedLanguage}
5. NAVIGATION & DIRECTIONS: If user asks to navigate to a place, address, business, or coordinates (e.g., "navigate to Miami Beach", "directions to Starbucks", "take me to 123 Main St"), provide detailed turn-by-turn directions with the exact destination address or coordinates
6. SEARCH: Provide detailed, relevant results using REAL-TIME data from internet with current info
7. REAL-TIME INFO: Answer questions with current, accurate information (2025 data, not outdated info)
8. MULTILINGUAL: Always respond in ${selectedLanguage} naturally, fluently, and conversationally
9. CONTEXT AWARENESS: Remember previous conversation context and provide coherent responses
10. TREND AWARENESS: Know what's viral, trending, and popular on social media and in the local area RIGHT NOW

NAVIGATION FORMAT: When user requests directions, respond with:
- The exact destination address or coordinates
- Current estimated time and distance
- Include the word "NAVIGATE:" at the start of your response so the app can detect it

SMART ACTIONS YOU CAN TAKE:
- Book experiences and services with current pricing details
- Check wallet balance and make payments
- Translate between any supported languages with cultural nuance
- Find and recommend services with real-time availability
- Navigate to different sections of the app
- Answer questions with CURRENT, accurate information from the internet
- Provide local insights and recommendations with up-to-date data
- Search real-time news, weather, prices, events

ACCURACY REQUIREMENT: You MUST provide accurate, current information. If asked about dates, events, prices, or time-sensitive info, use the real-time internet data available to you. Never give outdated information - always use 2025 data.

LOCAL EXPERTISE: When user asks "what's going on", "what should I do", "where should I eat", etc., proactively search for and provide:
- What's trending and hot RIGHT NOW in their city
- Events happening today and this week
- Popular restaurants with current wait times
- Nightlife spots that are buzzing tonight
- New openings getting attention
- Viral Instagram/TikTok spots in the area

Be conversational, helpful, culturally aware, accurate, and action-oriented. If something requires user action (like booking), guide them step by step with clear instructions. If you need to navigate them somewhere, be explicit and tell them where you're taking them.

Respond naturally and conversationally in ${selectedLanguage}, using local slang and cultural references when appropriate:`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: contextPrompt,
        add_context_from_internet: true
      });

      const assistantMessage = { role: "assistant", content: response };
      setMessages(prev => [...prev, assistantMessage]);

      // Text-to-speech response
      speak(response);

      // Handle in-app navigation (to different pages)
      await handleNavigationIntent(messageText, response);

      // Handle map navigation/directions
      await handleMapNavigationIntent(messageText, response);

      // Handle booking intents
      await handleBookingIntent(messageText);

      // Handle payment intents
      await handlePaymentIntent(messageText);

    } catch (error) {
      console.error("Ronron error:", error);
      
      // Report error to diagnostics
      try {
        await base44.functions.invoke('systemDiagnostics', {
          action: 'error_report',
          context: {
            error: error.message,
            stack: error.stack,
            userMessage: messageText,
            timestamp: new Date().toISOString()
          }
        });
      } catch {}

      const errorMessage = {
        role: "assistant",
        content: selectedLanguage === "Haitian Creole" 
          ? "Padon, mwen gen pwoblèm kounye a. Tanpri eseye ankò!" 
          : selectedLanguage === "Jamaican Patois"
          ? "Sorry mi friend, mi have likkle trouble right now. Try again nuh!"
          : selectedLanguage === "Russian"
          ? "Извините, у меня сейчас проблемы с подключением. Пожалуйста, попробуйте еще раз!"
          : "I apologize, I'm having trouble connecting right now. Please try again in a moment!"
      };
      setMessages(prev => [...prev, errorMessage]);
      speak(errorMessage.content);
    }

    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
    }
    setIsLoading(false);
  };

  const handleNavigationIntent = async (userText, aiResponse) => {
    const lowerText = userText.toLowerCase();
    
    // Detect navigation keywords for app pages
    if (lowerText.includes('wallet') || lowerText.includes('balance') || lowerText.includes('coins')) {
      setTimeout(() => navigate(createPageUrl("Wallet")), 1500);
    } else if (lowerText.includes('marketplace') || lowerText.includes('services') || lowerText.includes('shop')) {
      setTimeout(() => navigate(createPageUrl("Marketplace")), 1500);
    } else if (lowerText.includes('experience') || lowerText.includes('explore')) {
      setTimeout(() => navigate(createPageUrl("explore")), 1500);
    } else if (lowerText.includes('profile') || lowerText.includes('account')) {
      setTimeout(() => navigate(createPageUrl("Profile")), 1500);
    } else if (lowerText.includes('ride') || lowerText.includes('travel')) {
      setTimeout(() => navigate(createPageUrl("Travel")), 1500);
    } else if (lowerText.includes('real estate') || lowerText.includes('property')) {
      setTimeout(() => navigate(createPageUrl("RealEstate")), 1500);
    }
  };

  const handleMapNavigationIntent = async (userText, aiResponse) => {
    const lowerText = userText.toLowerCase();
    
    // Detect map navigation requests
    const navKeywords = ['navigate', 'direction', 'take me', 'how to get', 'route to', 'way to', 'lost', 'find'];
    const hasNavKeyword = navKeywords.some(keyword => lowerText.includes(keyword));
    
    if (hasNavKeyword || aiResponse.includes('NAVIGATE:')) {
      // Extract destination from user text
      const destination = userText.replace(/navigate|direction|take me|how to get|route to|way to|to the|to/gi, '').trim();
      
      if (destination.length > 3) {
        try {
          setIsLoading(true);
          
          // Get current location with high accuracy
          const getCurrentLocation = () => new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
              reject(new Error('Geolocation not supported'));
              return;
            }
            
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                });
              },
              (error) => {
                console.error('Geolocation error:', error);
                reject(error);
              },
              { 
                enableHighAccuracy: true, 
                timeout: 10000, 
                maximumAge: 0 
              }
            );
          });

          let origin;
          let originCoords = null;
          
          try {
            originCoords = await getCurrentLocation();
            origin = `${originCoords.lat},${originCoords.lng}`;
          } catch (geoError) {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: "⚠️ Unable to access your location. Please enable location permissions in your browser settings to get accurate directions."
            }]);
            setIsLoading(false);
            return;
          }
          
          const response = await base44.functions.invoke('getDirections', {
            origin: origin,
            destination: destination,
            mode: 'driving'
          });

          if (response.data && !response.data.error) {
            setNavigationData({
              destination: destination,
              directions: response.data,
              originCoords: originCoords,
              destinationCoords: response.data.end_location 
                ? [response.data.end_location.lat, response.data.end_location.lng]
                : null
            });
            setShowNavigation(true);
          } else {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: `Sorry, I couldn't get directions to "${destination}". ${response.data?.message || 'Please try a different location.'}`
            }]);
          }
          setIsLoading(false);
        } catch (error) {
          console.error('Navigation error:', error);
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `I encountered an error getting directions. Please try again.`
          }]);
          setIsLoading(false);
        }
      }
    }
  };

  const handleBookingIntent = async (userText) => {
    const lowerText = userText.toLowerCase();
    
    if (lowerText.includes('book') || lowerText.includes('reserve')) {
      // Create a follow-up message with booking options
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "Great! I can help you book that. Would you like to:\n\n1. Browse all experiences\n2. Search for something specific\n3. See today's deals\n\nJust let me know!"
        }]);
      }, 1000);
    }
  };

  const handlePaymentIntent = async (userText) => {
    const lowerText = userText.toLowerCase();
    
    if ((lowerText.includes('pay') || lowerText.includes('payment')) && currentUser) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `Your current SoFloCoin balance is ${currentUser.soflo_coins || 0} SFC. You can use this for payments across the platform. Need to add more funds?`
        }]);
      }, 1000);
    }
  };

  const handleQuickCommand = (command) => {
    setInputText(command);
    setTimeout(() => handleSend(command), 100);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in your browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const toggleSpeaking = () => {
    setIsSpeaking(!isSpeaking);
    if (!isSpeaking) {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <>
      <LocationPermissionManager 
        onPermissionGranted={() => setLocationPermissionGranted(true)}
      />

      {showNavigation && navigationData && (
        <AINavigationView
          navigationData={navigationData}
          onClose={() => {
            setShowNavigation(false);
            setNavigationData(null);
          }}
        />
      )}

      {!showNavigation && (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-950 pb-20">
      {/* Header */}
      <div className="glass-effect border-b border-white/10 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ 
                scale: isListening ? [1, 1.2, 1] : 1,
                rotate: isLoading ? 360 : 0
              }}
              transition={{ 
                repeat: isListening ? Infinity : 0,
                duration: isLoading ? 1 : 2
              }}
              className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg"
            >
              <Brain className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Ronron AI
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </h1>
              <p className="text-sm text-gray-400">14 Languages • Voice AI • Ultra Smart</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Enhanced Language Selector */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              {languages.map(lang => (
                <option key={lang} value={lang} className="bg-gray-900">{lang}</option>
              ))}
            </select>

            <button
              onClick={toggleSpeaking}
              className={`p-3 glass-effect rounded-full transition ${
                isSpeaking ? 'bg-green-500/20' : 'bg-white/10'
              }`}
            >
              {isSpeaking ? (
                <Volume2 className="w-5 h-5 text-green-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Commands */}
      <div className="px-6 py-4 border-b border-white/10 overflow-x-auto">
        <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Quick Actions
        </p>
        <div className="flex gap-3 pb-2">
          {quickCommands.map((cmd, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleQuickCommand(cmd.command)}
              className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${cmd.color} rounded-xl hover:scale-105 transition-transform text-left min-w-[200px]`}
            >
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <cmd.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-white text-sm font-medium">{cmd.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] px-5 py-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                  : 'glass-effect text-white border border-white/10'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="glass-effect px-5 py-3 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="glass-effect border-t border-white/10 px-6 py-4">
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 flex items-center justify-center gap-2 text-red-400"
          >
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Listening...</span>
          </motion.div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white/10 rounded-2xl border border-white/20 focus-within:border-indigo-500 transition">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`Ask Ronron in ${selectedLanguage}...`}
              className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
            />
            
            <button
              onClick={toggleListening}
              className={`p-2 rounded-full transition ${
                isListening 
                  ? 'bg-red-500 animate-pulse' 
                  : 'bg-indigo-500/20 hover:bg-indigo-500/30'
              }`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? (
                <MicOff className="w-5 h-5 text-white" />
              ) : (
                <Mic className="w-5 h-5 text-indigo-400" />
              )}
            </button>
          </div>

          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            className="p-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full hover:scale-110 transition-transform disabled:opacity-50 disabled:scale-100 shadow-lg"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2 text-center">
          Ronron can book, pay, translate, and navigate • Voice & text supported
        </p>
      </div>
    </div>
      )}
    </>
  );
}
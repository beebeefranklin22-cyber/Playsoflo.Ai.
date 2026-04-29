import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { analyzeAdPerformance } from "@/functions/analyzeAdPerformance";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Sparkles, TrendingUp, TrendingDown, Minus,
  Loader2, ChevronDown, ChevronUp, CheckCircle, Lightbulb, DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const GRADE_CONFIG = {
  excellent: { color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", label: "Excellent" },
  good:      { color: "text-blue-400",  bg: "bg-blue-500/10 border-blue-500/30",   label: "Good" },
  fair:      { color: "text-yellow-400",bg: "bg-yellow-500/10 border-yellow-500/30",label: "Fair" },
  poor:      { color: "text-red-400",   bg: "bg-red-500/10 border-red-500/30",     label: "Needs Work" },
};

const BUDGET_ICON = {
  increase: TrendingUp,
  decrease: TrendingDown,
  maintain: Minus,
};

function CampaignAICard({ campaign, onToggleAI, onApplyHeadline, onApplyBudget, isAnalyzing }) {
  const [expanded, setExpanded] = useState(false);
  const s = campaign.ai_suggestions || {};
  const grade = GRADE_CONFIG[s.performance_grade] || GRADE_CONFIG.fair;
  const BudgetIcon = BUDGET_ICON[s.budget_action] || Minus;
  const hasInsights = !!s.analyzed_at;

  return (
    <div className={`rounded-2xl border transition-all ${
      campaign.ai_optimized
        ? "border-purple-500/40 bg-purple-500/5"
        : "border-white/10 bg-white/5"
    }`}>
      {/* Row header */}
      <div className="flex items-center gap-3 p-4">
        {/* AI toggle */}
        <button
          onClick={() => onToggleAI(campaign)}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            campaign.ai_optimized ? "bg-purple-600" : "bg-white/20"
          }`}
          title={campaign.ai_optimized ? "Disable AI-Assist" : "Enable AI-Assist"}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
            campaign.ai_optimized ? "left-5" : "left-0.5"
          }`} />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{campaign.campaign_name}</p>
          <p className="text-gray-400 text-xs">
            {campaign.ai_optimized ? (
              hasInsights
                ? `Last analyzed ${format(new Date(s.analyzed_at), "MMM d, h:mm a")}`
                : "AI-Assist enabled — not yet analyzed"
            ) : "AI-Assist off"}
          </p>
        </div>

        {/* Grade badge */}
        {hasInsights && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${grade.bg} ${grade.color}`}>
            {grade.label}
          </span>
        )}

        {/* Analyze / expand buttons */}
        {campaign.ai_optimized && (
          <Button
            size="sm"
            onClick={() => onToggleAI(campaign, true)}
            disabled={isAnalyzing === campaign.id}
            className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 text-xs px-3"
          >
            {isAnalyzing === campaign.id
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <><Sparkles className="w-3.5 h-3.5 mr-1" />Analyze</>
            }
          </Button>
        )}

        {hasInsights && (
          <button onClick={() => setExpanded(e => !e)} className="p-1 text-gray-400 hover:text-white transition">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Expanded insights */}
      <AnimatePresence>
        {expanded && hasInsights && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10"
          >
            <div className="p-4 space-y-4">
              {/* Performance summary */}
              <div className={`rounded-xl border p-3 ${grade.bg}`}>
                <p className={`text-xs font-semibold mb-1 ${grade.color}`}>Performance Summary</p>
                <p className="text-gray-300 text-xs leading-relaxed">{s.performance_reason}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                  <span>CTR: <strong className="text-white">{s.current_ctr ?? "–"}%</strong></span>
                  <span>CPC: <strong className="text-white">${s.current_cpc ?? "–"}</strong></span>
                </div>
              </div>

              {/* Headline suggestions */}
              {s.headline_suggestions?.length > 0 && (
                <div>
                  <p className="text-gray-300 text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-yellow-400" /> Headline Suggestions
                  </p>
                  <div className="space-y-2">
                    {s.headline_suggestions.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                        <p className="text-white text-xs flex-1">"{h}"</p>
                        <button
                          onClick={() => onApplyHeadline(campaign, h)}
                          className="flex-shrink-0 text-[10px] text-purple-400 hover:text-purple-300 font-semibold px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition"
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget recommendation */}
              {s.budget_action && (
                <div className="bg-white/5 rounded-xl p-3 flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                    s.budget_action === "increase" ? "bg-green-500/20" :
                    s.budget_action === "decrease" ? "bg-red-500/20" : "bg-gray-500/20"
                  }`}>
                    <BudgetIcon className={`w-4 h-4 ${
                      s.budget_action === "increase" ? "text-green-400" :
                      s.budget_action === "decrease" ? "text-red-400" : "text-gray-400"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold capitalize">{s.budget_action} Budget</p>
                    <p className="text-gray-400 text-[11px] leading-relaxed mt-0.5">{s.budget_reasoning}</p>
                    {s.suggested_budget && s.budget_action !== "maintain" && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-gray-400 text-[11px]">
                          ${campaign.budget_amount} → <strong className="text-white">${s.suggested_budget}</strong>
                        </span>
                        <button
                          onClick={() => onApplyBudget(campaign, s.suggested_budget)}
                          className="text-[10px] text-green-400 hover:text-green-300 font-semibold px-2 py-0.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Creative tips */}
              {s.creative_tips?.length > 0 && (
                <div>
                  <p className="text-gray-300 text-xs font-semibold mb-2">Creative Tips</p>
                  <ul className="space-y-1.5">
                    {s.creative_tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                        <CheckCircle className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AIAssistPanel({ campaigns, onCampaignsChange }) {
  const [analyzingId, setAnalyzingId] = useState(null);

  const handleToggleAI = async (campaign, runAnalysis = false) => {
    try {
      if (runAnalysis && campaign.ai_optimized) {
        // Just run analysis, don't toggle
        setAnalyzingId(campaign.id);
        await analyzeAdPerformance({ campaign_id: campaign.id });
        toast.success("AI analysis complete!");
        onCampaignsChange();
        setAnalyzingId(null);
        return;
      }

      const newValue = !campaign.ai_optimized;
      await base44.entities.AdCampaign.update(campaign.id, { ai_optimized: newValue });
      toast.success(newValue ? "AI-Assist enabled!" : "AI-Assist disabled");
      onCampaignsChange();

      // Auto-run analysis when enabling
      if (newValue) {
        setAnalyzingId(campaign.id);
        await analyzeAdPerformance({ campaign_id: campaign.id });
        onCampaignsChange();
        setAnalyzingId(null);
      }
    } catch (e) {
      toast.error("Failed: " + e.message);
      setAnalyzingId(null);
    }
  };

  const handleApplyHeadline = async (campaign, headline) => {
    try {
      await base44.entities.AdCampaign.update(campaign.id, { headline });
      toast.success("Headline updated!");
      onCampaignsChange();
    } catch (e) {
      toast.error("Failed to apply headline");
    }
  };

  const handleApplyBudget = async (campaign, budget) => {
    try {
      await base44.entities.AdCampaign.update(campaign.id, { budget_amount: budget });
      toast.success(`Budget updated to $${budget}`);
      onCampaignsChange();
    } catch (e) {
      toast.error("Failed to apply budget");
    }
  };

  const handleAnalyzeAll = async () => {
    const aiCampaigns = campaigns.filter(c => c.ai_optimized && c.status === "active");
    if (!aiCampaigns.length) {
      toast.info("Enable AI-Assist on at least one active campaign first");
      return;
    }
    setAnalyzingId("all");
    try {
      await analyzeAdPerformance({});
      toast.success(`Analyzed ${aiCampaigns.length} campaign(s)!`);
      onCampaignsChange();
    } catch (e) {
      toast.error("Analysis failed: " + e.message);
    }
    setAnalyzingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">AI-Assist</h3>
            <p className="text-gray-400 text-xs">Auto-analyze performance & suggest improvements</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleAnalyzeAll}
          disabled={analyzingId === "all"}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white text-xs px-3"
        >
          {analyzingId === "all"
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Analyzing…</>
            : <><Sparkles className="w-3.5 h-3.5 mr-1" />Analyze All</>
          }
        </Button>
      </div>

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-white/10 rounded-2xl">
          No campaigns yet — create one to use AI-Assist
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <CampaignAICard
              key={c.id}
              campaign={c}
              onToggleAI={handleToggleAI}
              onApplyHeadline={handleApplyHeadline}
              onApplyBudget={handleApplyBudget}
              isAnalyzing={analyzingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
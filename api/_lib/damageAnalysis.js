import { askClaudeForJson } from './anthropic.js';

// Shared by api/ai-assist.js (action: damage_analysis) and api/car-damage.js
// (called in-process, not over HTTP, to avoid re-deriving auth for a
// second serverless invocation).
export async function damageAnalysis({ description, estimated_cost, photos }) {
  return askClaudeForJson({
    systemPrompt:
      'You assess vehicle damage reports for a peer-to-peer car rental platform. Given the renter\'s description and their own cost estimate, suggest a fair settlement amount (can be less than, equal to, or more than their estimate), a severity rating, a confidence score, and a short reasoning. You cannot see the photos themselves, only how many were provided as evidence — weigh that as a minor signal only. Return {"suggested_settlement": number, "severity": "minor"|"moderate"|"severe", "confidence_score": number (0-100), "reasoning": "..."}.',
    prompt: JSON.stringify({ description, renter_estimated_cost: estimated_cost, photo_count: (photos || []).length }),
  }).catch(() => ({
    suggested_settlement: estimated_cost,
    severity: 'moderate',
    confidence_score: 0,
    reasoning: 'AI analysis unavailable; defaulted to renter\'s own estimate pending manual review.',
  }));
}

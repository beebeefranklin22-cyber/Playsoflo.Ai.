import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { booking_id, booking_type, document_url, document_back_url, customer_name } = await req.json();

    if (!booking_id || !booking_type || !document_url || !customer_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Build file_urls array — include back if provided
    const file_urls = [document_url];
    if (document_back_url) file_urls.push(document_back_url);

    // AI vision analysis of the document
    const analysisPrompt = `You are an identity document verification system. Analyze the provided ID document image(s) carefully.

Extract and evaluate the following:
1. Full name on the document
2. Expiry/expiration date
3. Document type (driver's license, passport, national ID, state ID)
4. Whether the document appears genuine (no obvious signs of tampering, clear text, proper formatting)

Then verify:
- Is the document expired? Today's date is ${today}. If expiry date is before today, it is EXPIRED.
- Does the name on the document match or closely match: "${customer_name}"? (allow for minor variations like middle name missing, name order differences)

Respond ONLY with valid JSON in this exact format:
{
  "extracted_name": "full name from document",
  "document_type": "type of document",
  "expiry_date": "YYYY-MM-DD or null if not found",
  "is_expired": true or false,
  "name_matches": true or false,
  "name_match_confidence": "high/medium/low",
  "appears_genuine": true or false,
  "issues": ["list of any issues found, empty array if none"],
  "verdict": "verified" or "requires_manual_review",
  "verdict_reason": "brief explanation"
}

verdict should be "verified" only if: document is NOT expired, name matches with high or medium confidence, and document appears genuine.
Otherwise verdict should be "requires_manual_review".`;

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      file_urls,
      response_json_schema: {
        type: 'object',
        properties: {
          extracted_name: { type: 'string' },
          document_type: { type: 'string' },
          expiry_date: { type: 'string' },
          is_expired: { type: 'boolean' },
          name_matches: { type: 'boolean' },
          name_match_confidence: { type: 'string' },
          appears_genuine: { type: 'boolean' },
          issues: { type: 'array', items: { type: 'string' } },
          verdict: { type: 'string' },
          verdict_reason: { type: 'string' }
        }
      }
    });

    const verdict = aiResult.verdict || 'requires_manual_review';
    const isVerified = verdict === 'verified';
    const now = new Date().toISOString();

    // Update the correct entity based on booking type
    if (booking_type === 'car_rental') {
      await base44.asServiceRole.entities.CarRental.update(booking_id, {
        doc_verification_status: isVerified ? 'verified' : 'pending_review',
        status: isVerified ? 'approved' : 'pending_approval',
        doc_verified_at: isVerified ? now : null,
        doc_rejection_reason: isVerified ? null : `AI Review: ${aiResult.verdict_reason}`,
        license_expiry_date: aiResult.expiry_date || undefined,
        ai_verification_result: JSON.stringify(aiResult)
      });

      if (isVerified) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: user.email,
          type: 'booking_update',
          title: '✅ Documents Auto-Verified!',
          message: `Your driver's license was automatically verified. Your car rental booking is now approved!`,
          read: false
        });
      } else {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: user.email,
          type: 'booking_update',
          title: '🔍 Documents Sent for Manual Review',
          message: `Our AI flagged your document for manual review. Reason: ${aiResult.verdict_reason}. A provider will review shortly.`,
          read: false
        });
      }
    } else if (booking_type === 'property_booking') {
      await base44.asServiceRole.entities.PropertyBooking.update(booking_id, {
        doc_verification_status: isVerified ? 'verified' : 'pending_review',
        status: isVerified ? 'approved' : 'pending_approval',
        doc_verified_at: isVerified ? now : null,
        doc_rejection_reason: isVerified ? null : `AI Review: ${aiResult.verdict_reason}`,
        ai_verification_result: JSON.stringify(aiResult)
      });

      if (isVerified) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: user.email,
          type: 'booking_update',
          title: '✅ Identity Auto-Verified!',
          message: `Your identity document was automatically verified. Your property booking is now confirmed!`,
          read: false
        });
      } else {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: user.email,
          type: 'booking_update',
          title: '🔍 Identity Sent for Manual Review',
          message: `Our AI flagged your document for manual review. Reason: ${aiResult.verdict_reason}. The host will review shortly.`,
          read: false
        });
      }
    }

    return Response.json({
      success: true,
      verdict,
      is_verified: isVerified,
      details: aiResult
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { track_id, revenue_amount } = await req.json();
    if (!track_id || !revenue_amount) {
      return Response.json({ error: 'track_id and revenue_amount required' }, { status: 400 });
    }

    // Get royalty splits for the track
    const splitRecords = await base44.asServiceRole.entities.RoyaltySplit.filter({ track_id });
    if (splitRecords.length === 0) {
      return Response.json({ error: 'No royalty split found for this track' }, { status: 404 });
    }

    const split = splitRecords[0];

    // Delegate to universal settlement engine
    const result = await base44.functions.invoke('settlePayment', {
      vertical: 'music_royalty',
      reference_id: track_id,
      revenue_amount,
      splits: split.splits
    });

    return Response.json(result.data);

  } catch (error) {
    console.error('Error distributing royalties:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
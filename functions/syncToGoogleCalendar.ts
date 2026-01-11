import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_type, title, description, start_time, end_time, location, attendees } = await req.json();

    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    // Create calendar event
    const calendarEvent = {
      summary: title,
      description: description,
      location: location,
      start: {
        dateTime: new Date(start_time).toISOString(),
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: new Date(end_time).toISOString(),
        timeZone: 'America/New_York'
      },
      attendees: attendees?.map(email => ({ email })) || [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 }
        ]
      }
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(calendarEvent)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Calendar sync failed: ${error}`);
    }

    const event = await response.json();

    // Send notification
    await base44.asServiceRole.entities.Notification.create({
      user_email: user.email,
      title: 'Event Added to Calendar',
      message: `${title} has been synced to your Google Calendar`,
      type: 'system',
      read: false
    });

    return Response.json({ 
      success: true,
      event_id: event.id,
      event_link: event.htmlLink
    });

  } catch (error) {
    console.error('Calendar sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
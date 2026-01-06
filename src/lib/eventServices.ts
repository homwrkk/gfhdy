import { supabase } from './supabase';
import type { CreateEventFormData, Event, EventServiceBooking } from '../types/events';

/**
 * Create a new event in Supabase database
 */
export async function createEvent(
  userId: string,
  organizerName: string,
  formData: CreateEventFormData
): Promise<{ event: Event; error: null } | { event: null; error: string }> {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert({
        title: formData.eventName,
        description: formData.description,
        event_date: formData.eventDate,
        event_time: formData.eventTime,
        location: formData.location,
        organizer_id: userId,
        organizer_name: organizerName,
        organizer_specification: formData.organizerSpecification,
        capacity: formData.estimatedGuests,
        price: 0,
        attractions: formData.attractions ? formData.attractions.split(',').map(a => a.trim()) : [],
        features: formData.features || [],
        is_livestream: formData.isLivestream,
        livestream_url: formData.livestreamLink || null,
        category: 'business',
        status: 'upcoming',
        is_published: false,
      })
      .select()
      .single();

    if (error) {
      return { event: null, error: error.message };
    }

    return { event: data as Event, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { event: null, error: errorMessage };
  }
}

/**
 * Fetch all events created by a specific user (for My Events tab)
 * Only returns events not deleted from My Events
 */
export async function getUserEvents(userId: string): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('organizer_id', userId)
      .eq('is_visible_in_my_events', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user events:', error);
      return [];
    }

    return (data || []) as Event[];
  } catch (err) {
    console.error('Error in getUserEvents:', err);
    return [];
  }
}

/**
 * Fetch all published events (for Join tab) - visible to all users including non-logged-in
 */
export async function getPublishedEvents(): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_visible_in_join_tab', true)
      .eq('is_published', true)
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching published events:', error);
      return [];
    }

    return (data || []) as Event[];
  } catch (err) {
    console.error('Error in getPublishedEvents:', err);
    return [];
  }
}

/**
 * Publish an event (make it visible in Join tab to all users including non-logged-in)
 */
export async function publishEvent(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('events')
      .update({
        is_published: true,
        is_visible_in_join_tab: true,
        is_visible_in_my_events: true,
        published_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .eq('organizer_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Update an event
 */
export async function updateEvent(
  eventId: string,
  userId: string,
  updates: Partial<CreateEventFormData>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const updateData: Record<string, any> = {};

    if (updates.eventName) updateData.title = updates.eventName;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.eventDate) updateData.event_date = updates.eventDate;
    if (updates.eventTime) updateData.event_time = updates.eventTime;
    if (updates.location) updateData.location = updates.location;
    if (updates.estimatedGuests) updateData.capacity = updates.estimatedGuests;
    if (updates.budget !== undefined) updateData.price = updates.budget;
    if (updates.organizerSpecification !== undefined) updateData.organizer_specification = updates.organizerSpecification;
    if (updates.attractions) updateData.attractions = updates.attractions.split(',').map(a => a.trim()).filter(a => a);
    if (updates.features) updateData.features = updates.features;
    if (updates.isLivestream !== undefined) updateData.is_livestream = updates.isLivestream;
    if (updates.livestreamLink) updateData.livestream_url = updates.livestreamLink;

    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .eq('organizer_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Hide event from My Events (soft delete - keeps in database)
 */
export async function hideEventFromMyEvents(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('events')
      .update({
        is_visible_in_my_events: false,
        deleted_from_my_events_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .eq('organizer_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Hide event from Join tab (unpublish - keeps in database and in My Events)
 */
export async function hideEventFromJoinTab(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('events')
      .update({
        is_visible_in_join_tab: false,
        is_published: false,
        deleted_from_join_tab_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .eq('organizer_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Restore event to My Events (undo soft delete)
 */
export async function restoreEventToMyEvents(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('events')
      .update({
        is_visible_in_my_events: true,
        deleted_from_my_events_at: null,
      })
      .eq('id', eventId)
      .eq('organizer_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Book service providers for an event
 */
export async function bookEventServices(
  eventId: string,
  userId: string,
  bookings: Array<{
    providerId: string;
    providerName: string;
    providerCategory: string;
    quantity: number;
    basePrice: number;
  }>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const bookingData = bookings.map(booking => ({
      event_id: eventId,
      user_id: userId,
      provider_id: booking.providerId,
      provider_name: booking.providerName,
      provider_category: booking.providerCategory,
      quantity: booking.quantity,
      base_price: booking.basePrice,
      total_price: booking.basePrice * booking.quantity,
      booking_status: 'pending',
    }));

    const { error } = await supabase
      .from('event_service_bookings')
      .insert(bookingData);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get service bookings for a specific event
 */
export async function getEventServiceBookings(eventId: string): Promise<EventServiceBooking[]> {
  try {
    const { data, error } = await supabase
      .from('event_service_bookings')
      .select('*')
      .eq('event_id', eventId)
      .eq('booking_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching event service bookings:', error);
      return [];
    }

    return (data || []) as EventServiceBooking[];
  } catch (err) {
    console.error('Error in getEventServiceBookings:', err);
    return [];
  }
}

/**
 * Update a service booking status
 */
export async function updateServiceBooking(
  bookingId: string,
  userId: string,
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('event_service_bookings')
      .update({ booking_status: status })
      .eq('id', bookingId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Cancel a service booking
 */
export async function cancelServiceBooking(
  bookingId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  return updateServiceBooking(bookingId, userId, 'cancelled');
}

/**
 * Get total booking cost for an event
 */
export async function getEventBookingTotal(eventId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('calculate_event_booking_total_cost', { p_event_id: eventId });

    if (error) {
      console.error('Error calculating total cost:', error);
      return 0;
    }

    return data || 0;
  } catch (err) {
    console.error('Error in getEventBookingTotal:', err);
    return 0;
  }
}

/**
 * Upload event image to Backblaze B2
 */
export async function uploadEventImage(
  file: File,
  eventId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    // Folder structure: events/[eventId]/[filename]
    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const filename = `events/${eventId}/${timestamp}-${safeFilename}`;
    formData.append('filename', filename);
    formData.append('contentType', file.type || 'image/jpeg');

    // Call the edge function to upload to B2
    const { data, error } = await supabase.functions.invoke('upload-to-b2', {
      body: formData,
    });

    if (error) {
      console.error('Upload error:', error);
      return { url: null, error: typeof error === 'string' ? error : error?.message || 'Upload failed' };
    }

    if (!data || !data.publicUrl) {
      console.error('No URL in response:', data);
      return { url: null, error: 'No URL returned from B2' };
    }

    return { url: data.publicUrl, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Upload failed';
    console.error('Upload exception:', errorMessage);
    return { url: null, error: errorMessage };
  }
}

/**
 * Update event image URL in database
 */
export async function updateEventImage(
  eventId: string,
  userId: string,
  imageUrl: string,
  isThumbnail: boolean = false
): Promise<{ success: boolean; error: string | null }> {
  try {
    const updateData = isThumbnail
      ? { thumbnail_url: imageUrl }
      : { image_url: imageUrl };

    const { error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .eq('organizer_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Loader } from 'lucide-react';
import EventCard from './EventCard';
import EditEventModal from './EditEventModal';
import { getPublishedEvents } from '../lib/eventServices';
import { filterJoinTabEvents } from '../lib/eventUtils';
import type { Event as DBEvent } from '../types/events';
import { useAuth } from '../context/AuthContext';

interface JoinTabProps {
  searchQuery: string;
  selectedCategory: string;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
}

export default function JoinTab({
  searchQuery,
  selectedCategory,
  onSearchChange,
  onCategoryChange,
}: JoinTabProps) {
  const { user } = useAuth();
  const [nowTime, setNowTime] = useState(Date.now());
  const [calendarAdded, setCalendarAdded] = useState<Record<string, boolean>>({});
  const [publishedEvents, setPublishedEvents] = useState<DBEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<DBEvent | null>(null);

  const categories = ['all', 'social', 'networking', 'business', 'workshop', 'conference'];

  useEffect(() => {
    const t = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    loadPublishedEvents();
  }, []);

  const loadPublishedEvents = async () => {
    setIsLoading(true);
    try {
      const events = await getPublishedEvents();
      setPublishedEvents(events);
    } catch (err) {
      console.error('Error loading published events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter events to only show those visible in Join tab (not past 1 hour after event time)
  const visibleEvents = filterJoinTabEvents(publishedEvents);

  const filteredEvents = visibleEvents.filter((event) => {
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.organizer_specification || event.organizer_name).toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch && event.status === 'upcoming';
  });

  const toggleCalendar = (eventId: string) => {
    setCalendarAdded((prev) => {
      const added = !!prev[eventId];
      const next = { ...prev, [eventId]: !added };
      if (!added) {
        setTimeout(() => {
          if (window.confirm('Added to calendar. Get reminders?')) {
            alert('Reminders enabled for this event.');
          }
        }, 10);
      } else {
        alert('Removed from calendar.');
      }
      return next;
    });
  };

  const handleShare = (event: DBEvent) => {
    const shareData = {
      title: event.title,
      text: event.description || '',
      url: window.location.href + '#event-' + event.id,
    };
    if ((navigator as any).share) {
      (navigator as any).share(shareData).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareData.url).then(() => alert('Event link copied to clipboard'));
    }
  };

  const handleRegister = (eventId: string) => {
    if (!user) {
      alert('Please sign in to book this event.');
      return;
    }
    alert('Booking functionality will be implemented soon. You can contact the organizer to register.');
  };

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 glass-effect rounded-xl border border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center space-x-4">
          <Filter className="text-gray-400 w-5 h-5" />
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="px-4 py-3 glass-effect rounded-xl border border-white/20 text-white bg-transparent focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
          >
            {categories.map((category) => (
              <option key={category} value={category} className="bg-gray-800">
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader className="w-12 h-12 text-rose-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading events...</p>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              nowTime={nowTime}
              calendarAdded={calendarAdded}
              onToggleCalendar={toggleCalendar}
              onShare={() => handleShare(event)}
              onRegister={() => handleRegister(event.id)}
              onEventUpdated={loadPublishedEvents}
              onEdit={() => setEditingEvent(event)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
          <p className="text-gray-400">Try adjusting your search criteria or check back later for new events.</p>
        </div>
      )}

      {editingEvent && user && (
        <EditEventModal
          event={editingEvent}
          isOpen={!!editingEvent}
          onClose={() => setEditingEvent(null)}
          onEventUpdated={loadPublishedEvents}
          userId={user.id}
        />
      )}
    </>
  );
}

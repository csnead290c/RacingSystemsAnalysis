/**
 * Promoted Events Component
 * 
 * Displays community-submitted events that have been approved by admins.
 * Users can view details and add events to their personal calendar.
 */

import { useState, useEffect, useCallback } from 'react';
import { promotedEventsStorage, eventsStorage } from '../../state/teamManagement';
import { useAuth } from '../../domain/auth';
import {
  type PromotedEvent,
  createPromotedEvent,
  createRaceEvent,
  PROMOTED_EVENT_TYPE_LABELS,
} from '../../domain/schemas/teamManagement.schema';

interface PromotedEventsProps {
  onEventAdded?: () => void;
}

export default function PromotedEvents({ onEventAdded }: PromotedEventsProps) {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = (user as { role?: string })?.role === 'admin' || (user as { role?: string })?.role === 'owner';
  
  const [events, setEvents] = useState<PromotedEvent[]>([]);
  const [pendingEvents, setPendingEvents] = useState<PromotedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PromotedEvent | null>(null);
  const [addingToCalendar, setAddingToCalendar] = useState<string | null>(null);
  
  // Form state for submitting new events
  const [formData, setFormData] = useState({
    name: '',
    trackName: '',
    trackLocation: '',
    description: '',
    startDate: '',
    endDate: '',
    eventType: 'bracket' as PromotedEvent['eventType'],
    entryFee: '',
    website: '',
    registrationUrl: '',
    contactName: '',
    contactEmail: '',
  });
  
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const approved = await promotedEventsStorage.getApproved();
      setEvents(approved.sort((a, b) => a.startDate - b.startDate));
      
      if (isAdmin) {
        const pending = await promotedEventsStorage.getPending();
        setPendingEvents(pending);
      }
    } catch (error) {
      console.error('Failed to load promoted events:', error);
    }
    setLoading(false);
  }, [isAdmin]);
  
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);
  
  const handleSubmit = async () => {
    if (!formData.name || !formData.trackName || !formData.startDate || !user?.id) {
      alert('Please fill in required fields');
      return;
    }
    
    try {
      const event = createPromotedEvent({
        name: formData.name,
        trackName: formData.trackName,
        trackLocation: formData.trackLocation || undefined,
        description: formData.description || undefined,
        startDate: new Date(formData.startDate).getTime(),
        endDate: formData.endDate ? new Date(formData.endDate).getTime() : undefined,
        eventType: formData.eventType,
        entryFee: formData.entryFee ? parseFloat(formData.entryFee) : undefined,
        website: formData.website || undefined,
        registrationUrl: formData.registrationUrl || undefined,
        contactName: formData.contactName || undefined,
        contactEmail: formData.contactEmail || undefined,
        submittedBy: user.id,
      });
      
      await promotedEventsStorage.save(event);
      setShowSubmitForm(false);
      setFormData({
        name: '',
        trackName: '',
        trackLocation: '',
        description: '',
        startDate: '',
        endDate: '',
        eventType: 'bracket',
        entryFee: '',
        website: '',
        registrationUrl: '',
        contactName: '',
        contactEmail: '',
      });
      alert('Event submitted for review! It will appear once approved by an admin.');
    } catch (error) {
      console.error('Failed to submit event:', error);
      alert('Failed to submit event');
    }
  };
  
  const handleAddToCalendar = async (event: PromotedEvent) => {
    if (!user?.id) return;
    
    setAddingToCalendar(event.id);
    try {
      // Create a RaceEvent from the promoted event
      const raceEvent = createRaceEvent({
        name: event.name,
        trackName: event.trackName,
        startDate: event.startDate,
        endDate: event.endDate || event.startDate,
        status: 'planned',
        classes: event.classes || [],
        entryFee: event.entryFee,
        notes: `Added from Promoted Events\n${event.description || ''}\n${event.website ? `Website: ${event.website}` : ''}`.trim(),
      });
      
      await eventsStorage.save(raceEvent);
      await promotedEventsStorage.incrementAddedCount(event.id);
      
      alert('Event added to your calendar!');
      onEventAdded?.();
    } catch (error) {
      console.error('Failed to add event to calendar:', error);
      alert('Failed to add event');
    }
    setAddingToCalendar(null);
  };
  
  const handleApprove = async (eventId: string) => {
    if (!user?.id) return;
    await promotedEventsStorage.approve(eventId, user.id);
    loadEvents();
  };
  
  const handleReject = async (eventId: string) => {
    if (!user?.id) return;
    const reason = prompt('Rejection reason (optional):');
    await promotedEventsStorage.reject(eventId, user.id, reason || undefined);
    loadEvents();
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading promoted events...
      </div>
    );
  }
  
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>🏁 Community Events</h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Upcoming events shared by the racing community
          </p>
        </div>
        {isAuthenticated && (
          <button
            className="btn btn-small"
            onClick={() => setShowSubmitForm(!showSubmitForm)}
          >
            {showSubmitForm ? 'Cancel' : '+ Submit Event'}
          </button>
        )}
      </div>
      
      {/* Admin: Pending Events */}
      {isAdmin && pendingEvents.length > 0 && (
        <div className="card" style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b' }}>
          <h4 style={{ margin: '0 0 12px', color: '#f59e0b' }}>⏳ Pending Approval ({pendingEvents.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingEvents.map(event => (
              <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <strong>{event.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                    {event.trackName} • {formatDate(event.startDate)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-small" onClick={() => handleApprove(event.id)} style={{ backgroundColor: '#10b981' }}>
                    ✓ Approve
                  </button>
                  <button className="btn btn-small btn-secondary" onClick={() => handleReject(event.id)}>
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Submit Form */}
      {showSubmitForm && (
        <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
          <h4 style={{ margin: '0 0 16px' }}>Submit a Community Event</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label">Event Name *</label>
              <input
                className="input"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Big Money Bracket Race"
              />
            </div>
            <div>
              <label className="label">Track Name *</label>
              <input
                className="input"
                value={formData.trackName}
                onChange={e => setFormData(prev => ({ ...prev, trackName: e.target.value }))}
                placeholder="e.g., Thunder Valley Raceway"
              />
            </div>
            <div>
              <label className="label">Location</label>
              <input
                className="input"
                value={formData.trackLocation}
                onChange={e => setFormData(prev => ({ ...prev, trackLocation: e.target.value }))}
                placeholder="City, State"
              />
            </div>
            <div>
              <label className="label">Event Type</label>
              <select
                className="input"
                value={formData.eventType}
                onChange={e => setFormData(prev => ({ ...prev, eventType: e.target.value as PromotedEvent['eventType'] }))}
              >
                {Object.entries(PROMOTED_EVENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Start Date *</label>
              <input
                type="date"
                className="input"
                value={formData.startDate}
                onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input"
                value={formData.endDate}
                onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Entry Fee ($)</label>
              <input
                type="number"
                className="input"
                value={formData.entryFee}
                onChange={e => setFormData(prev => ({ ...prev, entryFee: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">Website</label>
              <input
                type="url"
                className="input"
                value={formData.website}
                onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Description</label>
              <textarea
                className="input"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Event details, classes, payouts, etc."
                rows={3}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="btn" onClick={handleSubmit}>Submit for Review</button>
            <button className="btn btn-secondary" onClick={() => setShowSubmitForm(false)}>Cancel</button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '12px' }}>
            Events are reviewed by admins before appearing publicly.
          </p>
        </div>
      )}
      
      {/* Events List */}
      {events.length === 0 ? (
        <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📅</div>
          <p>No upcoming community events.</p>
          {isAuthenticated && (
            <button className="btn btn-small" onClick={() => setShowSubmitForm(true)} style={{ marginTop: '12px' }}>
              Be the first to submit one!
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {events.map(event => (
            <div
              key={event.id}
              className="card"
              style={{
                padding: '16px',
                cursor: 'pointer',
                border: event.isPromoted ? '2px solid var(--color-accent)' : undefined,
              }}
              onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ margin: 0 }}>{event.name}</h4>
                    {event.isPromoted && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', backgroundColor: 'var(--color-accent)', color: 'white', borderRadius: '4px' }}>
                        ⭐ Featured
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    📍 {event.trackName}{event.trackLocation && ` • ${event.trackLocation}`}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    📅 {formatDate(event.startDate)}
                    {event.endDate && event.endDate !== event.startDate && ` - ${formatDate(event.endDate)}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: 'var(--color-surface)', borderRadius: '4px' }}>
                    {PROMOTED_EVENT_TYPE_LABELS[event.eventType]}
                  </div>
                  {event.entryFee && (
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '4px', color: '#10b981' }}>
                      ${event.entryFee}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Expanded Details */}
              {selectedEvent?.id === event.id && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                  {event.description && (
                    <p style={{ margin: '0 0 12px', fontSize: '0.9rem' }}>{event.description}</p>
                  )}
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                    {event.website && (
                      <a href={event.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>
                        🌐 Website
                      </a>
                    )}
                    {event.registrationUrl && (
                      <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>
                        📝 Register
                      </a>
                    )}
                    {event.contactEmail && (
                      <a href={`mailto:${event.contactEmail}`} style={{ color: 'var(--color-accent)' }}>
                        ✉️ Contact
                      </a>
                    )}
                  </div>
                  {isAuthenticated && (
                    <button
                      className="btn btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCalendar(event);
                      }}
                      disabled={addingToCalendar === event.id}
                      style={{ marginTop: '12px' }}
                    >
                      {addingToCalendar === event.id ? 'Adding...' : '📅 Add to My Calendar'}
                    </button>
                  )}
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '12px' }}>
                    {event.addedToCalendarCount > 0 && `${event.addedToCalendarCount} racers added this`}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

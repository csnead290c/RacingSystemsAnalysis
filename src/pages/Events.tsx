/**
 * Race Events Calendar & Management Page
 * Plan race season, track registrations, results, and expenses
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Page from '../shared/components/Page';
import { eventsStorage } from '../state/teamManagement';
import {
  type RaceEvent,
  type EventStatus,
  EVENT_STATUS_LABELS,
  createRaceEvent,
} from '../domain/schemas/teamManagement.schema';

type ViewMode = 'calendar' | 'list';

function Events() {
  const [events, setEvents] = useState<RaceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<EventStatus | 'all'>('all');
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  
  // Editor state
  const [editingEvent, setEditingEvent] = useState<RaceEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [_showResults, setShowResults] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<RaceEvent>>({});

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const eventsData = await eventsStorage.getAll();
        setEvents(eventsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (filterStatus !== 'all' && event.status !== filterStatus) return false;
      const eventYear = new Date(event.startDate).getFullYear();
      if (eventYear !== filterYear) return false;
      return true;
    }).sort((a, b) => a.startDate - b.startDate);
  }, [events, filterStatus, filterYear]);

  // Stats
  const stats = useMemo(() => {
    const yearEvents = events.filter(e => new Date(e.startDate).getFullYear() === filterYear);
    const attended = yearEvents.filter(e => e.status === 'attended');
    const upcoming = yearEvents.filter(e => e.status === 'planned' || e.status === 'registered' || e.status === 'confirmed');
    
    const totalEntryFees = yearEvents.reduce((sum, e) => sum + (e.entryFee || 0), 0);
    const totalPrize = attended.reduce((sum, e) => {
      const prizeMoney = e.results?.reduce((p, r) => p + (r.prizeMoney || 0), 0) || 0;
      return sum + prizeMoney;
    }, 0);
    
    const wins = attended.reduce((count, e) => {
      const eventWins = e.results?.reduce((w, r) => {
        const roundWins = r.eliminations?.filter(el => el.result === 'win').length || 0;
        return w + roundWins;
      }, 0) || 0;
      return count + eventWins;
    }, 0);
    
    return {
      total: yearEvents.length,
      attended: attended.length,
      upcoming: upcoming.length,
      totalEntryFees,
      totalPrize,
      wins,
    };
  }, [events, filterYear]);

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    
    const days: Array<{ date: Date | null; events: RaceEvent[] }> = [];
    
    // Padding for days before month starts
    for (let i = 0; i < startPadding; i++) {
      days.push({ date: null, events: [] });
    }
    
    // Days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dayStart = date.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      const dayEvents = events.filter(e => {
        return (e.startDate >= dayStart && e.startDate < dayEnd) ||
               (e.endDate >= dayStart && e.endDate < dayEnd) ||
               (e.startDate <= dayStart && e.endDate >= dayEnd);
      });
      
      days.push({ date, events: dayEvents });
    }
    
    return days;
  }, [currentMonth, events]);

  // Handlers
  const handleCreate = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    
    setFormData({
      name: '',
      trackName: '',
      startDate: tomorrow.getTime(),
      endDate: tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000,
      status: 'planned',
      classes: [],
    });
    setEditingEvent(null);
    setIsCreating(true);
    setShowEditor(true);
  }, []);

  const handleEdit = useCallback((event: RaceEvent) => {
    setFormData({ ...event });
    setEditingEvent(event);
    setIsCreating(false);
    setShowEditor(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.name || !formData.trackName || !formData.startDate) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const eventData = isCreating
        ? createRaceEvent({
            name: formData.name,
            trackName: formData.trackName,
            trackId: formData.trackId,
            address: formData.address,
            startDate: formData.startDate,
            endDate: formData.endDate || formData.startDate,
            registrationDeadline: formData.registrationDeadline,
            status: formData.status || 'planned',
            classes: formData.classes || [],
            entryFee: formData.entryFee,
            registrationNumber: formData.registrationNumber,
            registrationUrl: formData.registrationUrl,
            travelDistance: formData.travelDistance,
            hotelName: formData.hotelName,
            hotelCost: formData.hotelCost,
            hotelConfirmation: formData.hotelConfirmation,
            fuelEstimate: formData.fuelEstimate,
            notes: formData.notes,
          })
        : { ...editingEvent!, ...formData, updatedAt: Date.now() };

      await eventsStorage.save(eventData as RaceEvent);
      
      const updatedEvents = await eventsStorage.getAll();
      setEvents(updatedEvents);
      setShowEditor(false);
    } catch (error) {
      console.error('Failed to save event:', error);
      alert('Failed to save event');
    }
  }, [formData, isCreating, editingEvent]);

  const handleDelete = useCallback(async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await eventsStorage.delete(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event');
    }
  }, []);

  const handleStatusChange = useCallback(async (event: RaceEvent, newStatus: EventStatus) => {
    try {
      const updated = { ...event, status: newStatus, updatedAt: Date.now() };
      await eventsStorage.save(updated);
      setEvents(prev => prev.map(e => e.id === event.id ? updated : e));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }, []);

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case 'planned': return '#6b7280';
      case 'registered': return '#3b82f6';
      case 'confirmed': return '#10b981';
      case 'attended': return '#8b5cf6';
      case 'cancelled': return '#ef4444';
      case 'postponed': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateRange = (start: number, end: number) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (startDate.toDateString() === endDate.toDateString()) {
      return formatDate(start);
    }
    
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  if (loading) {
    return (
      <Page title="Race Events">
        <div className="text-center" style={{ padding: '4rem' }}>
          <p>Loading events...</p>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Race Events">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="card card-compact" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{filterYear} Events</div>
        </div>
        <div className="card card-compact" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>
            {stats.attended}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Attended</div>
        </div>
        <div className="card card-compact" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>
            {stats.upcoming}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Upcoming</div>
        </div>
        <div className="card card-compact" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
            {stats.wins}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Round Wins</div>
        </div>
        <div className="card card-compact" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
            ${stats.totalEntryFees.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Entry Fees</div>
        </div>
        <div className="card card-compact" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
            ${stats.totalPrize.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Prize Money</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card mb-4" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Year Filter */}
          <select
            className="input"
            style={{ width: 'auto' }}
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
          >
            {years.map(year => (
              <option key={year} value={year}>{year} Season</option>
            ))}
          </select>
          
          {/* Status Filter */}
          <select
            className="input"
            style={{ width: 'auto' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as EventStatus | 'all')}
          >
            <option value="all">All Statuses</option>
            {Object.entries(EVENT_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          
          <div style={{ flex: 1 }} />
          
          {/* View Toggle */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className={`btn btn-small ${viewMode === 'list' ? '' : 'btn-secondary'}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
            <button
              className={`btn btn-small ${viewMode === 'calendar' ? '' : 'btn-secondary'}`}
              onClick={() => setViewMode('calendar')}
              title="Calendar view"
            >
              📅
            </button>
          </div>
          
          {/* Add Button */}
          <button className="btn" onClick={handleCreate}>
            + Add Event
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="card mb-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button
              className="btn btn-small btn-secondary"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            >
              ←
            </button>
            <h3 style={{ margin: 0 }}>
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              className="btn btn-small btn-secondary"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            >
              →
            </button>
          </div>
          
          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ padding: '8px', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {day}
              </div>
            ))}
            {calendarDays.map((day, idx) => (
              <div
                key={idx}
                style={{
                  minHeight: '80px',
                  padding: '4px',
                  backgroundColor: day.date ? 'var(--color-surface)' : 'transparent',
                  borderRadius: '4px',
                  border: day.date && day.date.toDateString() === new Date().toDateString() ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                }}
              >
                {day.date && (
                  <>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                      {day.date.getDate()}
                    </div>
                    {day.events.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        onClick={() => handleEdit(event)}
                        style={{
                          fontSize: '0.6rem',
                          padding: '2px 4px',
                          marginBottom: '2px',
                          borderRadius: '2px',
                          backgroundColor: `${getStatusColor(event.status)}20`,
                          color: getStatusColor(event.status),
                          cursor: 'pointer',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {event.name}
                      </div>
                    ))}
                    {day.events.length > 2 && (
                      <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>
                        +{day.events.length - 2} more
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        filteredEvents.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              {events.length === 0 ? 'No events yet. Plan your race season!' : 'No events match your filters.'}
            </p>
            {events.length === 0 && (
              <button className="btn" onClick={handleCreate}>+ Add First Event</button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredEvents.map(event => (
              <div key={event.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{event.name}</h3>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                      📍 {event.trackName}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      className="input"
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem' }}
                      value={event.status}
                      onChange={(e) => handleStatusChange(event, e.target.value as EventStatus)}
                    >
                      {Object.entries(EVENT_STATUS_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Date</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{formatDateRange(event.startDate, event.endDate)}</div>
                  </div>
                  
                  {event.classes && event.classes.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Classes</div>
                      <div style={{ fontSize: '0.9rem' }}>{event.classes.join(', ')}</div>
                    </div>
                  )}
                  
                  {event.entryFee && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Entry Fee</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>${event.entryFee}</div>
                    </div>
                  )}
                  
                  {event.travelDistance && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Distance</div>
                      <div style={{ fontSize: '0.9rem' }}>{event.travelDistance} mi</div>
                    </div>
                  )}
                  
                  {event.registrationDeadline && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Reg. Deadline</div>
                      <div style={{ fontSize: '0.9rem', color: event.registrationDeadline < Date.now() ? '#ef4444' : 'inherit' }}>
                        {formatDate(event.registrationDeadline)}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Results summary if attended */}
                {event.status === 'attended' && event.results && event.results.length > 0 && (
                  <div style={{ padding: '12px', backgroundColor: 'var(--color-surface)', borderRadius: '6px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '8px', color: '#8b5cf6' }}>Results</div>
                    {event.results.map((result, idx) => {
                      const roundWins = result.eliminations?.filter(e => e.result === 'win').length || 0;
                      const totalRounds = result.eliminations?.length || 0;
                      return (
                        <div key={idx} style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                          <span>{result.class}</span>
                          <span style={{ color: '#10b981' }}>{roundWins}W - {totalRounds - roundWins}L</span>
                          {result.finalPosition && <span>Finished #{result.finalPosition}</span>}
                          {result.prizeMoney && <span style={{ color: '#10b981' }}>${result.prizeMoney}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-small btn-secondary" onClick={() => handleEdit(event)}>
                    Edit
                  </button>
                  {event.status === 'attended' && (
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => { setEditingEvent(event); setShowResults(true); }}
                    >
                      Results
                    </button>
                  )}
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() => handleDelete(event.id)}
                    style={{ color: '#ef4444' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>{isCreating ? 'Add Event' : 'Edit Event'}</h2>
              <button
                onClick={() => setShowEditor(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text)' }}
              >
                ×
              </button>
            </div>

            {/* Event Details Section */}
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--color-accent)' }}>Event Details</h4>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="col-span-2">
                <label className="label">Event Name *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., NHRA Division 4 Points Race"
                />
              </div>

              <div className="col-span-2">
                <label className="label">Track Name *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.trackName || ''}
                  onChange={(e) => setFormData({ ...formData, trackName: e.target.value })}
                  placeholder="e.g., Texas Motorplex"
                />
              </div>

              <div>
                <label className="label">Start Date *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value).getTime() })}
                />
              </div>

              <div>
                <label className="label">End Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, endDate: new Date(e.target.value).getTime() })}
                />
              </div>

              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={formData.status || 'planned'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as EventStatus })}
                >
                  {Object.entries(EVENT_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Classes (comma-separated)</label>
                <input
                  type="text"
                  className="input"
                  value={formData.classes?.join(', ') || ''}
                  onChange={(e) => setFormData({ ...formData, classes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="e.g., Super Comp, Super Gas"
                />
              </div>
            </div>

            {/* Registration Section */}
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--color-accent)' }}>Registration</h4>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="label">Entry Fee ($)</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={formData.entryFee ?? ''}
                  onChange={(e) => setFormData({ ...formData, entryFee: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="label">Registration Deadline</label>
                <input
                  type="date"
                  className="input"
                  value={formData.registrationDeadline ? new Date(formData.registrationDeadline).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value ? new Date(e.target.value).getTime() : undefined })}
                />
              </div>

              <div>
                <label className="label">Confirmation Number</label>
                <input
                  type="text"
                  className="input"
                  value={formData.registrationNumber || ''}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  placeholder="Registration #"
                />
              </div>

              <div>
                <label className="label">Registration URL</label>
                <input
                  type="url"
                  className="input"
                  value={formData.registrationUrl || ''}
                  onChange={(e) => setFormData({ ...formData, registrationUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Travel Section */}
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--color-accent)' }}>Travel & Lodging</h4>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="label">Travel Distance (miles)</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={formData.travelDistance ?? ''}
                  onChange={(e) => setFormData({ ...formData, travelDistance: parseFloat(e.target.value) || undefined })}
                />
              </div>

              <div>
                <label className="label">Fuel Estimate ($)</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={formData.fuelEstimate ?? ''}
                  onChange={(e) => setFormData({ ...formData, fuelEstimate: parseFloat(e.target.value) || undefined })}
                />
              </div>

              <div>
                <label className="label">Hotel Name</label>
                <input
                  type="text"
                  className="input"
                  value={formData.hotelName || ''}
                  onChange={(e) => setFormData({ ...formData, hotelName: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Hotel Cost ($)</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={formData.hotelCost ?? ''}
                  onChange={(e) => setFormData({ ...formData, hotelCost: parseFloat(e.target.value) || undefined })}
                />
              </div>

              <div className="col-span-2">
                <label className="label">Hotel Confirmation</label>
                <input
                  type="text"
                  className="input"
                  value={formData.hotelConfirmation || ''}
                  onChange={(e) => setFormData({ ...formData, hotelConfirmation: e.target.value })}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-full" onClick={handleSave}>
                {isCreating ? 'Add Event' : 'Save Changes'}
              </button>
              <button className="btn btn-secondary btn-full" onClick={() => setShowEditor(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

export default Events;

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../services/apiClient.js';
import { useAuth } from '../../auth/AuthContext.jsx';

const weekdayShortNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric'
});
const dayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric'
});

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const eventDateKey = (event) => (event?.startISO ?? '').slice(0, 10);
const eventTime = (event) => {
  const iso = event?.startISO ?? '';
  return iso.length >= 16 ? iso.slice(11, 16) : '';
};

const isAllDayEvent = (event) => Boolean(event?.allDay) || !eventTime(event);

export function Calendar() {
  const { user } = useAuth();
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [events, setEvents] = useState([]);
  const [draft, setDraft] = useState({
    title: '',
    time: '',
    notes: ''
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const statusTimerRef = useRef();

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const data = await apiClient.get('/api/events');
        if (!canceled) {
          setEvents(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!canceled) {
          setErrorMessage(error.message || 'Unable to load events.');
        }
      } finally {
        if (!canceled) {
          setIsLoading(false);
        }
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (!statusMessage) {
      return undefined;
    }
    statusTimerRef.current = setTimeout(() => {
      setStatusMessage('');
      statusTimerRef.current = undefined;
    }, 3200);
    return () => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
        statusTimerRef.current = undefined;
      }
    };
  }, [statusMessage]);

  const selectedDateObj = useMemo(() => fromDateKey(selectedDate), [selectedDate]);

  const visibleMonthDate = useMemo(
    () => new Date(visibleMonth.year, visibleMonth.month, 1),
    [visibleMonth]
  );

  const monthLabel = useMemo(() => monthFormatter.format(visibleMonthDate), [visibleMonthDate]);

  const visibleDays = useMemo(() => {
    const year = visibleMonth.year;
    const month = visibleMonth.month;
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;
    const days = [];

    for (let cell = 0; cell < totalCells; cell += 1) {
      const dayOffset = cell - startDayOfWeek + 1;
      const date = new Date(year, month, dayOffset);
      const dateKey = toDateKey(date);
      const isCurrentMonth = date.getMonth() === month;
      const isToday = toDateKey(today) === dateKey;
      const isSelected = selectedDate === dateKey;
      const dayEvents = events.filter((event) => eventDateKey(event) === dateKey);

      days.push({
        key: dateKey,
        label: date.getDate(),
        isCurrentMonth,
        isToday,
        isSelected,
        eventsCount: dayEvents.length,
        date
      });
    }

    return days;
  }, [events, selectedDate, today, visibleMonth]);

  const eventsForSelectedDate = useMemo(() => {
    return events
      .filter((event) => eventDateKey(event) === selectedDate)
      .sort((a, b) => {
        if (isAllDayEvent(a) && !isAllDayEvent(b)) {
          return -1;
        }
        if (!isAllDayEvent(a) && isAllDayEvent(b)) {
          return 1;
        }
        const timeA = eventTime(a);
        const timeB = eventTime(b);
        if (timeA && timeB) {
          return timeA.localeCompare(timeB);
        }
        if (timeA) return -1;
        if (timeB) return 1;
        return (a.title || '').localeCompare(b.title || '');
      });
  }, [events, selectedDate]);

  const changeMonth = (delta) => {
    setVisibleMonth((previous) => {
      const newMonth = previous.month + delta;
      const newYear = previous.year + Math.floor(newMonth / 12);
      const normalizedMonth = ((newMonth % 12) + 12) % 12;
      return { year: newYear, month: normalizedMonth };
    });
  };

  const handleSelectDay = (dateKey) => {
    setSelectedDate(dateKey);
    const newDate = fromDateKey(dateKey);
    setVisibleMonth({ year: newDate.getFullYear(), month: newDate.getMonth() });
  };

  const handleDraftChange = (event) => {
    const { name, value } = event.target;
    setDraft((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const buildStartISO = () => {
    const trimmedTime = draft.time.trim();
    if (!trimmedTime) {
      return `${selectedDate}T00:00:00`;
    }
    return `${selectedDate}T${trimmedTime.padEnd(5, '0')}:00`;
  };

  const handleAddEvent = async (event) => {
    event.preventDefault();
    const trimmedTitle = draft.title.trim();
    if (!trimmedTitle) {
      setStatusMessage('Enter a title to schedule something.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const payload = {
        title: trimmedTitle,
        startISO: buildStartISO(),
        allDay: !draft.time.trim()
      };
      const notes = draft.notes.trim();
      if (notes) {
        payload.description = notes;
      }

      const created = await apiClient.post('/api/events', payload);
      setEvents((previous) => [...previous, created]);
      setDraft({ title: '', time: '', notes: '' });
      setStatusMessage('Saved event.');
    } catch (requestError) {
      setErrorMessage(requestError.message || 'Unable to save event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    const existing = events.find((event) => event.id === eventId);
    if (!existing) {
      return;
    }
    setEvents((previous) => previous.filter((event) => event.id !== eventId));
    try {
      await apiClient.delete(`/api/events/${eventId}`);
      setStatusMessage('Removed event.');
    } catch (requestError) {
      setErrorMessage(requestError.message || 'Unable to remove event.');
      setEvents((previous) => [...previous, existing]);
    }
  };

  return (
    <section className="dashboard-card calendar-card">
      <header className="calendar-header">
        <div>
          <h2 className="section-title">Calendar</h2>
          <p className="calendar-subtitle">{dayFormatter.format(selectedDateObj)}</p>
        </div>
        <div className="calendar-controls">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
            ‹
          </button>
          <span>{monthLabel}</span>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
            ›
          </button>
        </div>
      </header>

      {user ? (
        <p className="calendar-user" role="note">
          Signed in as {user.username}
        </p>
      ) : null}

      {isLoading ? (
        <p className="calendar-status" role="status">
          Loading schedule…
        </p>
      ) : null}

      {statusMessage ? (
        <p className="calendar-status" role="status">
          {statusMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="calendar-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="calendar-grid">
        {weekdayShortNames.map((weekday) => (
          <div key={weekday} className="calendar-weekday" aria-hidden="true">
            {weekday}
          </div>
        ))}
        {visibleDays.map((day) => (
          <button
            key={day.key}
            type="button"
            className={`calendar-day${day.isCurrentMonth ? '' : ' calendar-day--faded'}${
              day.isToday ? ' calendar-day--today' : ''
            }${day.isSelected ? ' calendar-day--selected' : ''}`}
            onClick={() => handleSelectDay(day.key)}
            aria-pressed={day.isSelected}
          >
            <span className="calendar-day-number">{day.label}</span>
            {day.eventsCount > 0 ? (
              <span className="calendar-day-dot" aria-hidden="true">
                {day.eventsCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <form className="calendar-form" onSubmit={handleAddEvent}>
        <h3>Add to {dayFormatter.format(selectedDateObj)}</h3>
        <div className="calendar-form-grid">
          <label>
            <span>Title</span>
            <input
              type="text"
              name="title"
              value={draft.title}
              onChange={handleDraftChange}
              placeholder="What’s happening?"
              required
              disabled={isSubmitting}
            />
          </label>
          <label>
            <span>Time</span>
            <input
              type="time"
              name="time"
              value={draft.time}
              onChange={handleDraftChange}
              disabled={isSubmitting}
            />
          </label>
          <label className="calendar-notes">
            <span>Notes</span>
            <textarea
              name="notes"
              value={draft.notes}
              onChange={handleDraftChange}
              rows="2"
              placeholder="Extra details"
              disabled={isSubmitting}
            />
          </label>
        </div>
        <div className="calendar-form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>

      <section className="calendar-events">
        <h3>Planned</h3>
        {eventsForSelectedDate.length === 0 ? (
          <p className="calendar-events-empty">Nothing scheduled yet.</p>
        ) : (
          <ul>
            {eventsForSelectedDate.map((event) => (
              <li key={event.id}>
                <div className="calendar-event-main">
                  <div>
                    <p className="calendar-event-title">{event.title}</p>
                    {isAllDayEvent(event) ? (
                      <p className="calendar-event-time">All day</p>
                    ) : eventTime(event) ? (
                      <p className="calendar-event-time">{eventTime(event)}</p>
                    ) : null}
                  </div>
                  <button type="button" onClick={() => handleDeleteEvent(event.id)}>
                    Remove
                  </button>
                </div>
                {event.description ? (
                  <p className="calendar-event-notes">{event.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

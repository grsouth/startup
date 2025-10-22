import { useEffect, useMemo, useState } from 'react';

const LOCAL_STORAGE_KEY = 'dashboard.calendar.events.v1';

const createEvent = (dateKey, overrides = {}) => ({
  id:
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `event-${Date.now()}-${Math.random()}`,
  date: dateKey,
  title: overrides.title ?? 'Untitled event',
  time: overrides.time ?? '',
  notes: overrides.notes ?? '',
  createdAt: new Date().toISOString()
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

const seedEvents = [
  createEvent(toDateKey(new Date()), {
    title: 'Sprint planning',
    time: '09:30',
    notes: 'Review backlog and finalize priorities.'
  }),
  createEvent(toDateKey(new Date(new Date().setDate(new Date().getDate() + 3))), {
    title: 'Vet appointment',
    time: '15:15',
    notes: 'Bring vaccination records.'
  })
];

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

export function Calendar() {
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [events, setEvents] = useState(() => {
    if (typeof window === 'undefined') {
      return seedEvents;
    }
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) {
        return seedEvents;
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return seedEvents;
      }
      return parsed;
    } catch (error) {
      console.warn('Unable to load calendar events', error);
      return seedEvents;
    }
  });
  const [draft, setDraft] = useState({
    title: '',
    time: '',
    notes: ''
  });
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
    } catch (error) {
      console.warn('Unable to persist calendar events', error);
    }
  }, [events]);

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
      const dayEvents = events.filter((event) => event.date === dateKey);

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
      .filter((event) => event.date === selectedDate)
      .sort((a, b) => {
        if (a.time && b.time) {
          return a.time.localeCompare(b.time);
        }
        if (a.time) return -1;
        if (b.time) return 1;
        return a.title.localeCompare(b.title);
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

  const handleAddEvent = (event) => {
    event.preventDefault();
    const trimmedTitle = draft.title.trim();
    if (!trimmedTitle) {
      setStatusMessage('Enter a title to schedule something.');
      return;
    }
    const newEvent = createEvent(selectedDate, {
      title: trimmedTitle,
      time: draft.time.trim(),
      notes: draft.notes.trim()
    });
    setEvents((previous) => [...previous, newEvent]);
    setDraft({ title: '', time: '', notes: '' });
    setStatusMessage('Saved event.');
  };

  const handleDeleteEvent = (id) => {
    setEvents((previous) => previous.filter((event) => event.id !== id));
    setStatusMessage('Removed event.');
  };

  useEffect(() => {
    if (!statusMessage) {
      return;
    }
    const timer = setTimeout(() => {
      setStatusMessage('');
    }, 3500);
    return () => clearTimeout(timer);
  }, [statusMessage]);

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

      {statusMessage ? (
        <p className="calendar-status" role="status">
          {statusMessage}
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
            />
          </label>
          <label>
            <span>Time</span>
            <input
              type="time"
              name="time"
              value={draft.time}
              onChange={handleDraftChange}
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
            />
          </label>
        </div>
        <div className="calendar-form-actions">
          <button type="submit">Save</button>
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
                    {event.time ? <p className="calendar-event-time">{event.time}</p> : null}
                  </div>
                  <button type="button" onClick={() => handleDeleteEvent(event.id)}>
                    Remove
                  </button>
                </div>
                {event.notes ? <p className="calendar-event-notes">{event.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

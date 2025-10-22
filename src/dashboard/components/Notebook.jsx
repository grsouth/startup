import { useEffect, useMemo, useRef, useState } from 'react';

const LOCAL_STORAGE_KEY = 'dashboard.notebook.v1';

const createNote = (overrides = {}) => {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `note-${Date.now()}-${Math.random()}`;
  const timestamp = new Date().toISOString();
  return {
    id,
    title: 'Untitled note',
    content: '',
    updatedAt: timestamp,
    ...overrides
  };
};

const seedNotes = [
  createNote({
    title: 'Project kickoff checklist',
    content: '- Confirm scope with stakeholders\n- Draft architecture sketch\n- Schedule design review\n- Identify blockers to escalate',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
  }),
  createNote({
    title: 'Ideas to explore',
    content: '- Evaluate React Query for data fetching\n- Revisit CI pipeline flakiness\n- Draft blog post on dashboard UX learnings',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  }),
  createNote({
    title: 'Personal reminders',
    content: '1. Order new dog toys\n2. Back up home server configs\n3. Schedule annual check-up',
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  })
];

const sortNotes = (notes) =>
  [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

export function Notebook() {
  const isBrowser = typeof window !== 'undefined';
  const [notes, setNotes] = useState(() => {
    if (!isBrowser) {
      return sortNotes(seedNotes);
    }
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) {
        return sortNotes(seedNotes);
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return sortNotes(seedNotes);
      }
      return sortNotes(
        parsed.map((note) => ({
          ...note,
          updatedAt: note.updatedAt ?? new Date().toISOString()
        }))
      );
    } catch (error) {
      console.warn('Unable to load notebook data from storage', error);
      return sortNotes(seedNotes);
    }
  });
  const [selectedNoteId, setSelectedNoteId] = useState(() => notes[0]?.id ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [cloudStatus, setCloudStatus] = useState('');
  const saveTimerRef = useRef();
  const statusTimerRef = useRef();
  const cloudIntervalRef = useRef();

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  );

  const filteredNotes = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) {
      return notes;
    }
    return notes.filter((note) => {
      const titleMatch = note.title.toLowerCase().includes(trimmed);
      const contentMatch = note.content.toLowerCase().includes(trimmed);
      return titleMatch || contentMatch;
    });
  }, [notes, searchQuery]);

  useEffect(() => {
    if (filteredNotes.length === 0) {
      if (searchQuery.trim() && selectedNoteId !== null) {
        setSelectedNoteId(null);
      }
      return;
    }
    if (!filteredNotes.some((note) => note.id === selectedNoteId)) {
      setSelectedNoteId(filteredNotes[0].id);
    }
  }, [filteredNotes, searchQuery, selectedNoteId]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = undefined;
      }
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
        statusTimerRef.current = undefined;
      }
      if (cloudIntervalRef.current) {
        clearInterval(cloudIntervalRef.current);
        cloudIntervalRef.current = undefined;
      }
    };
  }, []);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    setIsSaving(true);
    saveTimerRef.current = window.setTimeout(() => {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes));
      setIsSaving(false);
      setLastSavedAt(new Date());
      saveTimerRef.current = undefined;
    }, 600);
  }, [isBrowser, notes]);

  useEffect(() => {
    if (!isBrowser) {
      return undefined;
    }
    cloudIntervalRef.current = window.setInterval(() => {
      const timestamp = new Date();
      setCloudStatus(`Cloud backup completed at ${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
      statusTimerRef.current = window.setTimeout(() => {
        setCloudStatus('');
        statusTimerRef.current = undefined;
      }, 5000);
    }, 90000);

    return () => {
      if (cloudIntervalRef.current) {
        clearInterval(cloudIntervalRef.current);
        cloudIntervalRef.current = undefined;
      }
    };
  }, [isBrowser]);

  const handleCreateNote = () => {
    const newNote = createNote({
      title: `New note ${notes.length + 1}`,
      content: ''
    });
    setNotes((previous) => sortNotes([newNote, ...previous]));
    setSelectedNoteId(newNote.id);
    if (searchQuery) {
      setSearchQuery('');
    }
  };

  const updateNote = (noteId, updates) => {
    setNotes((previous) =>
      sortNotes(
        previous.map((note) =>
          note.id === noteId
            ? {
                ...note,
                ...updates,
                updatedAt: new Date().toISOString()
              }
            : note
        )
      )
    );
  };

  const handleDeleteNote = (noteId) => {
    setNotes((previous) => {
      const updated = sortNotes(previous.filter((note) => note.id !== noteId));
      if (selectedNoteId === noteId) {
        setSelectedNoteId(updated[0]?.id ?? null);
      }
      return updated;
    });
  };

  const handleTitleChange = (event) => {
    const value = event.target.value;
    if (!selectedNote) {
      return;
    }
    updateNote(selectedNote.id, { title: value });
  };

  const handleContentChange = (event) => {
    const value = event.target.value;
    if (!selectedNote) {
      return;
    }
    updateNote(selectedNote.id, { content: value });
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSelectNote = (noteId) => {
    setSelectedNoteId(noteId);
  };

  return (
    <section className="dashboard-card notebook-card">
      <header className="notebook-header">
        <div>
          <h2 className="section-title">Notebook</h2>
          <p className="notebook-subtitle">Capture quick thoughts and keep them synced on this device.</p>
        </div>
        <div className="notebook-status">
          <span className="notebook-save">
            {isSaving ? 'Saving...' : lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Autosave enabled'}
          </span>
          {cloudStatus ? <span className="notebook-cloud">{cloudStatus}</span> : null}
        </div>
      </header>

      <div className="notebook-toolbar">
        <input
          type="search"
          placeholder="Search notes"
          value={searchQuery}
          onChange={handleSearchChange}
          aria-label="Search notes"
        />
        <button type="button" onClick={handleCreateNote}>
          New note
        </button>
      </div>

      <div className="notebook-body">
        <aside className="notebook-list" aria-label="Notebook entries">
          {filteredNotes.length === 0 ? (
            <p className="notebook-empty">No notes match that search. Create a new one?</p>
          ) : (
            <ul>
              {filteredNotes.map((note) => (
                <li key={note.id}>
                  <button
                    type="button"
                    className={`notebook-list-item${note.id === selectedNoteId ? ' active' : ''}`}
                    onClick={() => handleSelectNote(note.id)}
                  >
                    <span className="notebook-list-title">{note.title || 'Untitled note'}</span>
                    <span className="notebook-list-meta">
                      {new Date(note.updatedAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="notebook-list-preview">{note.content ? note.content.slice(0, 80) : 'Start typing to add content...'}</span>
                  </button>
                  <div className="notebook-list-actions">
                    <button type="button" onClick={() => handleDeleteNote(note.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="notebook-editor">
          {selectedNote ? (
            <>
              <input
                type="text"
                className="notebook-title-input"
                value={selectedNote.title}
                onChange={handleTitleChange}
                placeholder="Note title"
                aria-label="Note title"
              />
              <textarea
                value={selectedNote.content}
                onChange={handleContentChange}
                rows="12"
                placeholder="Start writing your note here..."
                aria-label="Note body"
              />
            </>
          ) : (
            <div className="notebook-placeholder">
              <p>Select a note on the left or create a new one to begin.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

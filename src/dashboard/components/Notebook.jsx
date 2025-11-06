import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../services/apiClient.js';

const sortNotes = (notes) =>
  [...notes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

export function Notebook() {
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const pendingUpdatesRef = useRef(new Map());
  const saveTimerRef = useRef();
  const statusTimerRef = useRef();

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const data = await apiClient.get('/api/notes');
        if (!canceled) {
          const sorted = Array.isArray(data) ? sortNotes(data) : [];
          setNotes(sorted);
          setSelectedNoteId(sorted[0]?.id ?? null);
        }
      } catch (error) {
        if (!canceled) {
          setErrorMessage(error.message || 'Unable to load notes.');
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
    }, 3500);
    return () => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
        statusTimerRef.current = undefined;
      }
    };
  }, [statusMessage]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = undefined;
      }
      pendingUpdatesRef.current.clear();
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
        statusTimerRef.current = undefined;
      }
    };
  }, []);

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
      const titleMatch = note.title?.toLowerCase().includes(trimmed);
      const bodyMatch = note.body?.toLowerCase().includes(trimmed);
      return titleMatch || bodyMatch;
    });
  }, [notes, searchQuery]);

  useEffect(() => {
    if (filteredNotes.length === 0) {
      setSelectedNoteId(null);
      return;
    }
    if (!filteredNotes.some((note) => note.id === selectedNoteId)) {
      setSelectedNoteId(filteredNotes[0].id);
    }
  }, [filteredNotes, selectedNoteId]);

  const scheduleSave = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(async () => {
      const entries = Array.from(pendingUpdatesRef.current.entries());
      if (entries.length === 0) {
        return;
      }
      pendingUpdatesRef.current.clear();
      saveTimerRef.current = undefined;
      setIsSaving(true);
      setErrorMessage('');
      try {
        const updates = await Promise.all(
          entries.map(async ([noteId, payload]) => {
            const updated = await apiClient.put(`/api/notes/${noteId}`, payload);
            return updated;
          })
        );
        setNotes((previous) =>
          sortNotes(
            previous.map((note) => {
              const update = updates.find((item) => item.id === note.id);
              return update ? update : note;
            })
          )
        );
        setLastSavedAt(new Date());
        setStatusMessage('All changes saved');
      } catch (error) {
        setErrorMessage(error.message || 'Unable to save note.');
      } finally {
        setIsSaving(false);
      }
    }, 600);
  };

  const queueUpdate = (noteId, updates) => {
    const pending = pendingUpdatesRef.current.get(noteId) ?? {};
    pendingUpdatesRef.current.set(noteId, { ...pending, ...updates });
    scheduleSave();
  };

  const applyNoteUpdates = (noteId, updates) => {
    const timestamp = new Date().toISOString();
    setNotes((previous) =>
      sortNotes(
        previous.map((note) =>
          note.id === noteId ? { ...note, ...updates, updatedAt: timestamp } : note
        )
      )
    );
    queueUpdate(noteId, updates);
  };

  const handleCreateNote = async () => {
    setErrorMessage('');
    try {
      const created = await apiClient.post('/api/notes', {
        title: `New note ${notes.length + 1}`,
        body: ''
      });
      setNotes((previous) => sortNotes([created, ...previous]));
      setSelectedNoteId(created.id);
      setStatusMessage('Note created');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to create note.');
    }
  };

  const handleDeleteNote = async (noteId) => {
    const existing = notes.find((note) => note.id === noteId);
    if (!existing) {
      return;
    }

    setNotes((previous) => previous.filter((note) => note.id !== noteId));
    if (selectedNoteId === noteId) {
      const remaining = notes.filter((note) => note.id !== noteId);
      setSelectedNoteId(remaining[0]?.id ?? null);
    }

    try {
      await apiClient.delete(`/api/notes/${noteId}`);
      setStatusMessage('Note deleted');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete note.');
      setNotes((previous) => sortNotes([...previous, existing]));
    }
  };

  const handleTitleChange = (event) => {
    if (!selectedNote) {
      return;
    }
    applyNoteUpdates(selectedNote.id, { title: event.target.value });
  };

  const handleBodyChange = (event) => {
    if (!selectedNote) {
      return;
    }
    applyNoteUpdates(selectedNote.id, { body: event.target.value });
  };

  return (
    <section className="dashboard-card notebook-card">
      <header className="notebook-header">
        <div>
          <h2 className="section-title">Notebook</h2>
          <p className="notebook-subtitle">Capture ideas and sync them securely.</p>
        </div>
        <div className="notebook-status">
          {isSaving ? (
            <span className="notebook-cloud" role="status">
              Saving…
            </span>
          ) : lastSavedAt ? (
            <span className="notebook-save">
              Saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : (
            <span className="notebook-save">Awaiting changes</span>
          )}
          {statusMessage ? <span>{statusMessage}</span> : null}
        </div>
      </header>

      <div className="notebook-toolbar">
        <input
          type="search"
          placeholder="Search notes"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        <button type="button" onClick={handleCreateNote}>
          New note
        </button>
      </div>

      {errorMessage ? (
        <p className="notebook-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="notebook-loading" role="status">
          Loading notes…
        </p>
      ) : null}

      <div className="notebook-body">
        <aside className="notebook-list">
          <h3>Notes</h3>
          {filteredNotes.length === 0 ? (
            <p className="notebook-empty">No notes found.</p>
          ) : (
            <ul>
              {filteredNotes.map((note) => (
                <li key={note.id}>
                  <button
                    type="button"
                    className={`notebook-list-item${
                      note.id === selectedNoteId ? ' active' : ''
                    }`}
                    onClick={() => setSelectedNoteId(note.id)}
                  >
                    <span className="notebook-list-title">
                      {note.title || 'Untitled'}
                    </span>
                    <span className="notebook-list-meta">
                      {new Date(note.updatedAt).toLocaleString()}
                    </span>
                    <span className="notebook-list-preview">
                      {note.body?.slice(0, 100) || 'No content yet.'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="notebook-delete"
                    onClick={() => handleDeleteNote(note.id)}
                    aria-label={`Delete ${note.title || 'untitled note'}`}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="notebook-editor">
          {selectedNote ? (
            <>
              <label className="notebook-editor-field">
                Title
                <input
                  type="text"
                  value={selectedNote.title}
                  onChange={handleTitleChange}
                />
              </label>
              <label className="notebook-editor-field notebook-editor-body">
                Body
                <textarea
                  value={selectedNote.body}
                  onChange={handleBodyChange}
                  rows={12}
                />
              </label>
            </>
          ) : (
            <p className="notebook-placeholder">
              Select a note or create a new one to start writing.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}

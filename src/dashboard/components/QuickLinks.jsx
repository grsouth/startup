import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../services/apiClient.js';

const SUGGESTED_LINKS = [
  {
    label: 'GitHub',
    url: 'https://github.com',
    iconUrl: 'https://github.com/favicon.ico'
  },
  {
    label: 'Canvas',
    url: 'https://byu.instructure.com',
    iconUrl: 'https://byu.instructure.com/favicon.ico'
  },
  {
    label: 'Gmail',
    url: 'https://mail.google.com',
    iconUrl: 'https://mail.google.com/favicon.ico'
  }
];

const INITIAL_DRAFT = { label: '', url: '', iconUrl: '' };

export function QuickLinks() {
  const [links, setLinks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const statusTimerRef = useRef();

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const data = await apiClient.get('/api/links');
        if (!canceled) {
          setLinks(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!canceled) {
          setErrorMessage(error.message || 'Unable to load quick links.');
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
    return () => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  const showStatus = (message) => {
    setStatusMessage(message);
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = setTimeout(() => setStatusMessage(''), 3200);
  };

  const linkInitials = useMemo(() => {
    const map = new Map();
    links.forEach((link) => {
      map.set(link.id, (link.label?.[0] ?? '#').toUpperCase());
    });
    return map;
  }, [links]);

  const toggleEditing = () => {
    setIsEditing((previous) => {
      const next = !previous;
      if (!next) {
        setDraft(INITIAL_DRAFT);
        setStatusMessage('');
        setErrorMessage('');
      }
      return next;
    });
  };

  const handleDraftChange = (event) => {
    const { name, value } = event.target;
    setDraft((previous) => ({
      ...previous,
      [name]: value
    }));
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleAddLink = async (event) => {
    event.preventDefault();

    const trimmedLabel = draft.label.trim();
    const trimmedUrl = draft.url.trim();
    const trimmedIcon = draft.iconUrl.trim();

    if (!trimmedLabel || !trimmedUrl) {
      setErrorMessage('Provide both a label and a URL.');
      return;
    }

    let normalizedUrl = trimmedUrl;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    if (links.some((link) => link.url === normalizedUrl)) {
      setErrorMessage('That link already exists.');
      return;
    }

    setIsBusy(true);
    setErrorMessage('');

    try {
      const created = await apiClient.post('/api/links', {
        label: trimmedLabel,
        url: normalizedUrl,
        iconUrl: trimmedIcon || undefined
      });
      setLinks((previous) => [...previous, created]);
      setDraft(INITIAL_DRAFT);
      showStatus('Link added.');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to add link.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemoveLink = async (id) => {
    setIsBusy(true);
    setErrorMessage('');
    try {
      await apiClient.delete(`/api/links/${id}`);
      setLinks((previous) => previous.filter((link) => link.id !== id));
      showStatus('Link removed.');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to remove link.');
    } finally {
      setIsBusy(false);
    }
  };

  const getIconSrc = (link) => {
    if (link.iconUrl) {
      return link.iconUrl;
    }
    try {
      const url = new URL(link.url);
      return `https://www.google.com/s2/favicons?sz=64&domain=${url.hostname}`;
    } catch (error) {
      return '';
    }
  };

  const handleIconError = (event) => {
    event.currentTarget.src = '/favicon.ico';
    event.currentTarget.onerror = null;
  };

  const showEmptyState = !isLoading && links.length === 0;

  return (
    <section className="dashboard-card quick-links-card">
      <div className="quick-links-header">
        <h2 className="section-title">Quick Links</h2>
        <div className="quick-links-actions">
          {statusMessage ? (
            <span className="quick-links-status" role="status">
              {statusMessage}
            </span>
          ) : null}
          <button type="button" onClick={toggleEditing} disabled={isBusy}>
            {isEditing ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="quick-links-status" role="status">
          Loading your shortcuts…
        </p>
      ) : null}

      {errorMessage ? (
        <p className="quick-links-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {isEditing ? (
        <form className="quick-links-form" onSubmit={handleAddLink}>
          <label>
            Label
            <input
              type="text"
              name="label"
              value={draft.label}
              onChange={handleDraftChange}
              placeholder="e.g. GitHub"
              disabled={isBusy}
            />
          </label>
          <label>
            URL
            <input
              type="url"
              name="url"
              value={draft.url}
              onChange={handleDraftChange}
              placeholder="https://example.com"
              disabled={isBusy}
            />
          </label>
          <label>
            Icon URL (optional)
            <input
              type="url"
              name="iconUrl"
              value={draft.iconUrl}
              onChange={handleDraftChange}
              placeholder="https://example.com/favicon.ico"
              disabled={isBusy}
            />
          </label>
          <button type="submit" disabled={isBusy}>
            {isBusy ? 'Saving…' : 'Add Link'}
          </button>
        </form>
      ) : null}

      {showEmptyState ? (
        <div className="quick-links-empty">
          <p>No saved links yet. Add your favorite sites to pin them here.</p>
          <ul>
            {SUGGESTED_LINKS.map((suggestion) => (
              <li key={suggestion.url}>
                <span>{suggestion.label}</span>
                <span>{suggestion.url}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <nav className="quick-links">
          <ul
            className={`quick-links-list${isEditing ? ' quick-links-list--editing' : ''}`}
          >
            {links.map((link) => {
              const iconSrc = getIconSrc(link) || '/favicon.ico';
              const initials = linkInitials.get(link.id) ?? '#';
              let displayUrl = link.url;
              try {
                const parsed = new URL(link.url);
                displayUrl = parsed.hostname.replace(/^www\./, '');
              } catch (error) {
                displayUrl = link.url;
              }

              return (
                <li key={link.id}>
                  <div className="quick-link-info">
                    {iconSrc ? (
                      <img
                        src={iconSrc}
                        alt=""
                        width="28"
                        height="28"
                        onError={handleIconError}
                      />
                    ) : (
                      <span className="quick-link-avatar" aria-hidden="true">
                        {initials}
                      </span>
                    )}

                    <div className="quick-link-meta">
                      <a href={link.url} target="_blank" rel="noreferrer">
                        {link.label}
                      </a>
                      <span className="quick-link-url">{displayUrl}</span>
                    </div>
                  </div>

                  {isEditing ? (
                    <button
                      type="button"
                      className="quick-link-delete"
                      onClick={() => handleRemoveLink(link.id)}
                      disabled={isBusy}
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </section>
  );
}

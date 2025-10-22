import { useEffect, useMemo, useState } from 'react';

const LOCAL_STORAGE_KEY = 'dashboard.quickLinks.v1';

const defaultLinks = [
  {
    label: 'Github',
    url: 'https://github.com/grsouth',
    iconUrl: 'https://github.com/favicon.ico'
  },
  {
    label: 'Jellyfin',
    url: 'http://jellyfin.local',
    iconUrl: 'http://jellyfin.local/favicon.ico'
  },
  {
    label: 'Canvas',
    url: 'https://byu.instructure.com',
    iconUrl: 'https://byu.instructure.com/favicon.ico'
  },
  {
    label: 'AWS',
    url: 'https://aws.amazon.com',
    iconUrl: 'https://aws.amazon.com/favicon.ico'
  },
  {
    label: 'Gmail',
    url: 'https://mail.google.com',
    iconUrl: 'https://mail.google.com/favicon.ico'
  },
  {
    label: 'Proton Mail',
    url: 'https://protonmail.com',
    iconUrl: 'https://protonmail.com/favicon.ico'
  }
];

const createLink = ({ label, url, iconUrl }) => ({
  id:
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `link-${Date.now()}-${Math.random()}`,
  label,
  url,
  iconUrl: iconUrl?.trim() || ''
});

const normalizeLinks = (links) =>
  links
    .filter((link) => link?.label && link?.url)
    .map((link) => ({
      id:
        link.id ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `link-${Date.now()}-${Math.random()}`),
      label: link.label,
      url: link.url,
      iconUrl: link.iconUrl ?? ''
    }));

export function QuickLinks() {
  const [links, setLinks] = useState(() => {
    if (typeof window === 'undefined') {
      return normalizeLinks(defaultLinks);
    }
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) {
        return normalizeLinks(defaultLinks);
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return normalizeLinks(defaultLinks);
      }
      const cleaned = normalizeLinks(parsed);
      return cleaned.length > 0 ? cleaned : normalizeLinks(defaultLinks);
    } catch (error) {
      console.warn('Unable to load quick links from storage', error);
      return normalizeLinks(defaultLinks);
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [draft, setDraft] = useState({ label: '', url: '', iconUrl: '' });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(links));
    } catch (error) {
      console.warn('Unable to persist quick links', error);
    }
  }, [links]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }
    const timer = window.setTimeout(() => setStatusMessage(''), 3200);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

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
        setDraft({ label: '', url: '', iconUrl: '' });
        setStatusMessage('');
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
  };

  const handleAddLink = (event) => {
    event.preventDefault();
    const trimmedLabel = draft.label.trim();
    const trimmedUrl = draft.url.trim();
    if (!trimmedLabel || !trimmedUrl) {
      setStatusMessage('Provide both a label and a URL.');
      return;
    }

    let normalizedUrl = trimmedUrl;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    if (links.some((link) => link.url === normalizedUrl)) {
      setStatusMessage('Link already exists.');
      return;
    }

    setLinks((previous) => [
      ...previous,
      createLink({
        label: trimmedLabel,
        url: normalizedUrl,
        iconUrl: draft.iconUrl.trim()
      })
    ]);
    setDraft({ label: '', url: '', iconUrl: '' });
    setStatusMessage('Link added.');
  };

  const handleRemoveLink = (id) => {
    setLinks((previous) => previous.filter((link) => link.id !== id));
    setStatusMessage('Link removed.');
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
          <button type="button" onClick={toggleEditing}>
            {isEditing ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      <nav className="quick-links">
        <ul className={`quick-links-list${isEditing ? ' quick-links-list--editing' : ''}`}>
          {links.map((link) => {
            const iconSrc = getIconSrc(link);
            const initial = linkInitials.get(link.id) ?? '#';
            return (
              <li key={link.id}>
                <div className="quick-link-info">
                  {iconSrc ? (
                    <img src={iconSrc} alt="" width="24" height="24" />
                  ) : (
                    <span className="quick-link-avatar" aria-hidden="true">
                      {initial}
                    </span>
                  )}
                  <div className="quick-link-meta">
                    <a href={link.url} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                    {isEditing ? <span className="quick-link-url">{link.url}</span> : null}
                  </div>
                </div>
                {isEditing ? (
                  <button
                    type="button"
                    className="quick-link-delete"
                    onClick={() => handleRemoveLink(link.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>

      {isEditing ? (
        <form className="quick-links-form" onSubmit={handleAddLink}>
          <h3>Add a link</h3>
          <div className="quick-links-form-grid">
            <label>
              <span>Label</span>
              <input
                type="text"
                name="label"
                value={draft.label}
                onChange={handleDraftChange}
                placeholder="Favorite site"
                required
              />
            </label>
            <label>
              <span>URL</span>
              <input
                type="url"
                name="url"
                value={draft.url}
                onChange={handleDraftChange}
                placeholder="https://example.com"
                required
              />
            </label>
            <label>
              <span>Icon URL</span>
              <input
                type="url"
                name="iconUrl"
                value={draft.iconUrl}
                onChange={handleDraftChange}
                placeholder="https://.../favicon.ico"
              />
            </label>
          </div>
          <div className="quick-links-form-actions">
            <button type="submit">Add link</button>
            <button
              type="button"
              onClick={() => setDraft({ label: '', url: '', iconUrl: '' })}
            >
              Clear
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

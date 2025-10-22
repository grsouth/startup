import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const LOCAL_STORAGE_KEY = 'dashboard.todoItems';
const MOCK_REMOTE_TASKS = [
  'Follow up on feature requests',
  'Block off time for design review',
  'Prep grocery order for Friday',
  'Schedule dog grooming appointment',
  'Share sprint notes with the team'
];

const createTask = (text, source = 'local') => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}-${Math.random()}`,
  text,
  completed: false,
  source,
  createdAt: new Date().toISOString()
});

const sortTasks = (tasks) =>
  [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

const defaultTasks = [
  createTask('Pet dog', 'seed'),
  createTask('Pet dog again', 'seed'),
  createTask('Feed dog', 'seed')
];

export function TodoList() {
  const messageTimeoutRef = useRef();
  const remoteIndexRef = useRef(0);
  const [tasks, setTasks] = useState(() => {
    if (typeof window === 'undefined') {
      return sortTasks(defaultTasks);
    }
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) {
        return sortTasks(defaultTasks);
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return sortTasks(defaultTasks);
      }
      const normalised = parsed.map((task) => ({
        ...task,
        createdAt: task.createdAt ?? new Date().toISOString()
      }));
      return sortTasks(normalised);
    } catch (error) {
      console.warn('Unable to load todo items from storage', error);
      return sortTasks(defaultTasks);
    }
  });
  const [draft, setDraft] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const isBrowser = typeof window !== 'undefined';
  const remainingCount = useMemo(() => tasks.filter((task) => !task.completed).length, [tasks]);
  const completedCount = tasks.length - remainingCount;

  const showStatus = useCallback((message) => {
    if (!message) {
      return;
    }
    setStatusMessage(message);
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    messageTimeoutRef.current = setTimeout(() => {
      setStatusMessage('');
      messageTimeoutRef.current = undefined;
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    setLastSavedAt(new Date());
  }, [isBrowser, tasks]);

  useEffect(() => {
    if (!isBrowser) {
      return undefined;
    }

    if (remoteIndexRef.current >= MOCK_REMOTE_TASKS.length) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const nextIndex = remoteIndexRef.current;
      if (nextIndex >= MOCK_REMOTE_TASKS.length) {
        window.clearInterval(intervalId);
        return;
      }

      const incomingTask = createTask(MOCK_REMOTE_TASKS[nextIndex], 'remote');
      remoteIndexRef.current += 1;

      let wasAdded = false;
      setTasks((previous) => {
        if (previous.some((task) => task.text.toLowerCase() === incomingTask.text.toLowerCase())) {
          return previous;
        }
        wasAdded = true;
        return sortTasks([...previous, incomingTask]);
      });
      if (wasAdded) {
        showStatus(`Collaborator added "${incomingTask.text}"`);
      }
    }, 45000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isBrowser, showStatus]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    setTasks((previous) => sortTasks([...previous, createTask(trimmed)]));
    setDraft('');
    showStatus(`Added "${trimmed}"`);
  };

  const handleToggle = (taskId) => {
    setTasks((previous) =>
      sortTasks(
        previous.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task))
      )
    );
  };

  const handleDelete = (taskId) => {
    setTasks((previous) => previous.filter((task) => task.id !== taskId));
    showStatus('Removed task');
  };

  const handleClearCompleted = () => {
    setTasks((previous) => previous.filter((task) => !task.completed));
    showStatus('Cleared completed tasks');
  };

  return (
    <section className="dashboard-card todo-card">
      <div className="todo-header">
        <h2 className="section-title">TODO</h2>
        <span className="todo-count">{remainingCount} open | {completedCount} done</span>
      </div>

      <p className="todo-description">
        Tasks sync in real-time with collaborators (simulated). Local changes persist to this device.
      </p>

      {statusMessage ? (
        <p className="todo-status" role="status">
          {statusMessage}
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <p className="todo-empty">No tasks yet. Add your first item to get started.</p>
      ) : (
        <ul className="todo-list">
          {tasks.map((task) => (
            <li key={task.id} className={`todo-item${task.completed ? ' completed' : ''}`}>
              <label>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleToggle(task.id)}
                  aria-label={`Mark "${task.text}" as ${task.completed ? 'incomplete' : 'complete'}`}
                />
                <span>{task.text}</span>
              </label>
              <button type="button" onClick={() => handleDelete(task.id)} className="todo-remove">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="todo-actions" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="New task"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Task name"
        />
        <button type="submit">Add</button>
      </form>

      <div className="todo-footer">
        <button type="button" onClick={handleClearCompleted} disabled={completedCount === 0}>
          Clear completed
        </button>
        <span className="todo-saved-at">
          {lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Syncing...'}
        </span>
      </div>
    </section>
  );
}

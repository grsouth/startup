import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../services/apiClient.js';

const sortTasks = (tasks) =>
  [...tasks].sort((a, b) => {
    if (a.done !== b.done) {
      return a.done ? 1 : -1;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

export function TodoList() {
  const [tasks, setTasks] = useState([]);
  const [draft, setDraft] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const statusTimerRef = useRef();

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const data = await apiClient.get('/api/todos');
        if (!canceled) {
          setTasks(Array.isArray(data) ? sortTasks(data) : []);
        }
      } catch (error) {
        if (!canceled) {
          setErrorMessage(error.message || 'Unable to load tasks.');
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
    statusTimerRef.current = setTimeout(() => setStatusMessage(''), 4000);
  };

  const remainingCount = useMemo(
    () => tasks.filter((task) => !task.done).length,
    [tasks]
  );

  const completedCount = tasks.length - remainingCount;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    setIsBusy(true);
    setErrorMessage('');

    try {
      const created = await apiClient.post('/api/todos', { text: trimmed });
      setTasks((previous) => sortTasks([...previous, created]));
      setDraft('');
      showStatus(`Added "${trimmed}"`);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to add task.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleToggle = async (task) => {
    const nextDone = !task.done;
    setTasks((previous) =>
      sortTasks(
        previous.map((item) =>
          item.id === task.id ? { ...item, done: nextDone } : item
        )
      )
    );

    try {
      const updated = await apiClient.put(`/api/todos/${task.id}`, {
        done: nextDone
      });
      setTasks((previous) =>
        sortTasks(
          previous.map((item) => (item.id === task.id ? updated : item))
        )
      );
      showStatus(
        nextDone
          ? `Marked "${task.text}" as complete`
          : `Reopened "${task.text}"`
      );
    } catch (error) {
      setTasks((previous) =>
        sortTasks(
          previous.map((item) =>
            item.id === task.id ? { ...item, done: !nextDone } : item
          )
        )
      );
      setErrorMessage(error.message || 'Unable to update task.');
    }
  };

  const handleDelete = async (task) => {
    setTasks((previous) => previous.filter((item) => item.id !== task.id));
    try {
      await apiClient.delete(`/api/todos/${task.id}`);
      showStatus('Removed task.');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to remove task.');
      setTasks((previous) => sortTasks([...previous, task]));
    }
  };

  const handleClearCompleted = async () => {
    const completed = tasks.filter((task) => task.done);
    if (completed.length === 0) {
      return;
    }
    setIsBusy(true);
    setTasks((previous) => previous.filter((task) => !task.done));
    try {
      await Promise.all(
        completed.map((task) => apiClient.delete(`/api/todos/${task.id}`))
      );
      showStatus('Cleared completed tasks.');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to clear completed tasks.');
      setTasks((previous) => sortTasks([...previous, ...completed]));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="dashboard-card todo-card">
      <div className="todo-header">
        <h2 className="section-title">TODO</h2>
        <span className="todo-count">
          {remainingCount} open | {completedCount} done
        </span>
      </div>

      <p className="todo-description">
        Tasks persist to your account and sync across devices.
      </p>

      {isLoading ? (
        <p className="todo-status" role="status">
          Loading tasks…
        </p>
      ) : null}

      {statusMessage ? (
        <p className="todo-status" role="status">
          {statusMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="todo-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <form className="todo-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Add a new task"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={isBusy}
        />
        <button type="submit" disabled={isBusy || !draft.trim()}>
          {isBusy ? 'Saving…' : 'Add'}
        </button>
      </form>

      {tasks.length === 0 && !isLoading ? (
        <p className="todo-empty">
          No tasks yet. Add your first item to get started.
        </p>
      ) : (
        <ul className="todo-list">
          {tasks.map((task) => (
            <li key={task.id} className={`todo-item${task.done ? ' completed' : ''}`}>
              <label>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => handleToggle(task)}
                  aria-label={`Mark "${task.text}" as ${task.done ? 'incomplete' : 'complete'}`}
                />
                <span>{task.text}</span>
              </label>
              <button
                type="button"
                onClick={() => handleDelete(task)}
                className="todo-remove"
                disabled={isBusy}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="todo-clear"
        onClick={handleClearCompleted}
        disabled={isBusy || completedCount === 0}
      >
        Clear completed
      </button>
    </section>
  );
}

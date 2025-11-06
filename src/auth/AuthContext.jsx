import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { apiClient, ApiError } from '../services/apiClient.js';

const AuthContext = createContext(null);

const STATUS = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(STATUS.LOADING);
  const [error, setError] = useState(null);
  const loadingRef = useRef(false);

  const runMe = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;
    try {
      const profile = await apiClient.get('/api/me');
      setUser(profile);
      setStatus(STATUS.AUTHENTICATED);
      setError(null);
    } catch (fetchError) {
      setUser(null);
      setStatus(STATUS.UNAUTHENTICATED);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    runMe();
  }, [runMe]);

  const handleAuthError = useCallback((authError) => {
    if (authError instanceof ApiError) {
      setError(authError.message);
      return authError;
    }
    const fallback = new ApiError('Unexpected authentication error', 500);
    setError(fallback.message);
    return fallback;
  }, []);

  const login = useCallback(
    async ({ username, password }) => {
      try {
        setError(null);
        const profile = await apiClient.post('/api/auth/login', {
          username: username?.trim(),
          password: password ?? ''
        });
        setUser(profile);
        setStatus(STATUS.AUTHENTICATED);
        return profile;
      } catch (authError) {
        setStatus(STATUS.UNAUTHENTICATED);
        throw handleAuthError(authError);
      }
    },
    [handleAuthError]
  );

  const register = useCallback(
    async ({ username, password }) => {
      try {
        setError(null);
        const profile = await apiClient.post('/api/auth/register', {
          username: username?.trim(),
          password: password ?? ''
        });
        setUser(profile);
        setStatus(STATUS.AUTHENTICATED);
        return profile;
      } catch (authError) {
        setStatus(STATUS.UNAUTHENTICATED);
        throw handleAuthError(authError);
      }
    },
    [handleAuthError]
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } finally {
      setUser(null);
      setStatus(STATUS.UNAUTHENTICATED);
      setError(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    setStatus(STATUS.LOADING);
    await runMe();
  }, [runMe]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      login,
      register,
      logout,
      refresh,
      clearError
    }),
    [user, status, error, login, register, logout, refresh, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const AuthStatus = STATUS;

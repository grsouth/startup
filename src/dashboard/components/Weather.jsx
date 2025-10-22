import { useEffect, useMemo, useRef, useState } from 'react';

const LOCAL_STORAGE_KEY = 'dashboard.weather.v1';

const MOCK_WEATHER = {
  'Provo, UT': {
    condition: 'Partly Cloudy',
    icon: '🌤️',
    temperature: 68,
    feelsLike: 65,
    high: 72,
    low: 52,
    humidity: 0.38,
    aqi: 42,
    wind: 7,
    updatedAt: new Date().toISOString()
  },
  'Seattle, WA': {
    condition: 'Light Rain',
    icon: '🌧️',
    temperature: 59,
    feelsLike: 58,
    high: 61,
    low: 51,
    humidity: 0.81,
    aqi: 18,
    wind: 9,
    updatedAt: new Date().toISOString()
  },
  'Phoenix, AZ': {
    condition: 'Sunny',
    icon: '☀️',
    temperature: 88,
    feelsLike: 85,
    high: 96,
    low: 74,
    humidity: 0.19,
    aqi: 55,
    wind: 5,
    updatedAt: new Date().toISOString()
  }
};

const defaultLocation = 'Provo, UT';

function getMockWeather(location) {
  const trimmed = location.trim();
  const key = trimmed ? trimmed.replace(/\s+/g, ' ') : defaultLocation;
  const now = new Date();
  const base = MOCK_WEATHER[key] ?? {
    condition: 'Clear',
    icon: '🌕',
    temperature: 62,
    feelsLike: 60,
    high: 66,
    low: 50,
    humidity: 0.42,
    aqi: 38,
    wind: 4,
    updatedAt: now.toISOString()
  };
  return {
    ...base,
    location: key,
    updatedAt: now.toISOString()
  };
}

export function Weather() {
  const [location, setLocation] = useState(defaultLocation);
  const [forecast, setForecast] = useState(() => getMockWeather(defaultLocation));
  const [savedLocations, setSavedLocations] = useState([defaultLocation]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const requestRef = useRef(0);
  const statusTimerRef = useRef();

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored);
      if (parsed?.location) {
        setLocation(parsed.location);
      }
      if (parsed?.forecast) {
        setForecast(parsed.forecast);
      }
      if (Array.isArray(parsed?.savedLocations) && parsed.savedLocations.length > 0) {
        setSavedLocations(parsed.savedLocations);
      }
    } catch (error) {
      console.warn('Unable to load weather preferences', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const payload = {
      location,
      forecast,
      savedLocations
    };
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to save weather preferences', error);
    }
  }, [forecast, location, savedLocations]);

  const feelsLikeText = useMemo(() => {
    if (!forecast) {
      return '';
    }
    const difference = forecast.feelsLike - forecast.temperature;
    if (Math.abs(difference) < 1) {
      return 'Feels like the actual temperature.';
    }
    if (difference > 0) {
      return `Feels ${Math.round(difference)}° warmer.`;
    }
    return `Feels ${Math.abs(Math.round(difference))}° cooler.`;
  }, [forecast]);

  const updateStatus = (message) => {
    setStatusMessage(message);
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = setTimeout(() => {
      setStatusMessage('');
      statusTimerRef.current = undefined;
    }, 4000);
  };

  const fetchForecast = async (requestedLocation) => {
    const trimmed = requestedLocation.trim();
    if (!trimmed) {
      setErrorMessage('Enter a location to check the weather.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    const requestId = Date.now();
    requestRef.current = requestId;

    await new Promise((resolve) => setTimeout(resolve, 850));
    const data = getMockWeather(trimmed);

    if (requestRef.current !== requestId) {
      return;
    }

    setForecast(data);
    setLocation(data.location);
    setIsLoading(false);
    updateStatus(`Updated at ${new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    fetchForecast(location);
  };

  const handleLocationChange = (event) => {
    setLocation(event.target.value);
  };

  const handleSelectSaved = (event) => {
    const value = event.target.value;
    if (!value) {
      return;
    }
    setLocation(value);
    fetchForecast(value);
  };

  const handleSaveLocation = () => {
    const trimmed = location.trim();
    if (!trimmed) {
      setErrorMessage('Enter a location before saving.');
      return;
    }
    if (savedLocations.includes(trimmed)) {
      updateStatus('Location already saved.');
      return;
    }
    setSavedLocations((previous) => [...previous, trimmed]);
    updateStatus('Saved location.');
  };

  const handleRemoveLocation = (target) => {
    setSavedLocations((previous) => previous.filter((loc) => loc !== target));
    updateStatus('Removed saved location.');
  };

  return (
    <section className="dashboard-card weather-card">
      <header className="weather-header">
        <h2 className="section-title">Weather</h2>
        <div className="weather-meta">
          {forecast ? (
            <span>Last checked {new Date(forecast.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          ) : null}
          {statusMessage ? (
            <span className="weather-status" role="status">
              {statusMessage}
            </span>
          ) : null}
        </div>
      </header>

      <form className="weather-search" onSubmit={handleSubmit}>
        <label>
          <span>Location</span>
          <input
            type="text"
            value={location}
            onChange={handleLocationChange}
            placeholder="City, State"
            aria-label="Location"
            disabled={isLoading}
          />
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Fetching...' : 'Refresh'}
        </button>
        <button type="button" onClick={handleSaveLocation} disabled={!location.trim()}>
          Save
        </button>
      </form>

      {errorMessage ? <p className="weather-error">{errorMessage}</p> : null}

      {forecast ? (
        <div className="weather-content">
          <div className="weather-current">
            <span className="weather-icon" role="img" aria-label={forecast.condition}>
              {forecast.icon}
            </span>
            <div>
              <p className="weather-temp">
                {Math.round(forecast.temperature)}
                <span>°F</span>
              </p>
              <p className="weather-condition">{forecast.condition}</p>
              <p className="weather-feels">{feelsLikeText}</p>
            </div>
          </div>
          <dl className="weather-details">
            <div>
              <dt>High</dt>
              <dd>{Math.round(forecast.high)}°F</dd>
            </div>
            <div>
              <dt>Low</dt>
              <dd>{Math.round(forecast.low)}°F</dd>
            </div>
            <div>
              <dt>Humidity</dt>
              <dd>{Math.round(forecast.humidity * 100)}%</dd>
            </div>
            <div>
              <dt>Wind</dt>
              <dd>{Math.round(forecast.wind)} mph</dd>
            </div>
            <div>
              <dt>AQI</dt>
              <dd>{forecast.aqi}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="weather-empty">No weather data yet. Refresh to load conditions.</p>
      )}

      {savedLocations.length > 0 ? (
        <aside className="weather-saved">
          <label htmlFor="savedLocations">Saved locations</label>
          <select id="savedLocations" onChange={handleSelectSaved} value="">
            <option value="">Select saved location</option>
            {savedLocations.map((saved) => (
              <option key={saved} value={saved}>
                {saved}
              </option>
            ))}
          </select>
          <ul>
            {savedLocations.map((saved) => (
              <li key={saved}>
                <span>{saved}</span>
                <button type="button" onClick={() => handleRemoveLocation(saved)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </section>
  );
}

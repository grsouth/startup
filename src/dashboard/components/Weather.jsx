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

const DEFAULT_LOCATION = 'Provo, UT';
const DEFAULT_COORDINATES = { lat: 40.2338, lon: -111.6585 };
const MOCK_USER_COORDINATES = { lat: 47.6062, lon: -122.3321 };

function getMockLocationFromCoords(coords) {
  if (!coords) {
    return DEFAULT_LOCATION;
  }

  const { lat, lon } = coords;
  if (lat > 45) {
    return 'Seattle, WA';
  }
  if (lat < 35 && lon < -100) {
    return 'Phoenix, AZ';
  }
  return DEFAULT_LOCATION;
}

function getMockWeather(location) {
  const key = location || DEFAULT_LOCATION;
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
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [forecast, setForecast] = useState(() => getMockWeather(DEFAULT_LOCATION));
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [coordinates, setCoordinates] = useState(DEFAULT_COORDINATES);
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
    const timer = setTimeout(() => {
      setCoordinates(MOCK_USER_COORDINATES);
    }, 300);

    return () => {
      clearTimeout(timer);
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
      if (parsed?.forecast && parsed.forecast.location) {
        setForecast(parsed.forecast);
        setLocation(parsed.forecast.location);
      }
      if (parsed?.coordinates) {
        setCoordinates(parsed.coordinates);
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
      coordinates
    };
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to save weather preferences', error);
    }
  }, [coordinates, forecast, location]);

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

  const fetchForecast = async (effectiveLocation) => {
    setIsLoading(true);
    const requestId = Date.now();
    requestRef.current = requestId;

    await new Promise((resolve) => setTimeout(resolve, 850));
    const data = getMockWeather(effectiveLocation);

    if (requestRef.current !== requestId) {
      setIsLoading(false);
      return;
    }

    setForecast(data);
    setLocation(data.location);
    setIsLoading(false);
    updateStatus(`Updated at ${new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  };

  useEffect(() => {
    let canceled = false;
    setIsLoading(true);
    const timer = setTimeout(() => {
      if (canceled) {
        return;
      }
      const coords = coordinates ?? DEFAULT_COORDINATES;
      const derivedLocation = getMockLocationFromCoords(coords);
      setLocation(derivedLocation);
      setForecast(getMockWeather(derivedLocation));
      setIsLoading(false);
      updateStatus('Detected location automatically.');
    }, 650);

    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [coordinates]);

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

      <div className="weather-search">
        <label>
          <span>Current location</span>
          <input type="text" value={location} readOnly aria-label="Current location" />
        </label>
        <button type="button" onClick={() => fetchForecast(location)} disabled={isLoading}>
          {isLoading ? 'Fetching...' : 'Refresh'}
        </button>
      </div>

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
    </section>
  );
}

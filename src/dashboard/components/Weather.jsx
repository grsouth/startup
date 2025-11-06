import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../services/apiClient.js';

const DEFAULT_COORDINATES = {
  latitude: 40.2338,
  longitude: -111.6585
};

const WEATHER_CODES = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫️' },
  48: { label: 'Rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  55: { label: 'Heavy drizzle', icon: '🌧️' },
  61: { label: 'Light rain', icon: '🌦️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  71: { label: 'Light snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '🌨️' },
  75: { label: 'Heavy snow', icon: '🌨️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  81: { label: 'Heavy showers', icon: '🌧️' },
  82: { label: 'Violent showers', icon: '🌧️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm & hail', icon: '⛈️' },
  99: { label: 'Heavy storm & hail', icon: '⛈️' }
};

const interpretWeatherCode = (code) => WEATHER_CODES[code] || { label: 'Unknown', icon: '❓' };

const parseNumberInput = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : '';
};

export function Weather() {
  const [coordinates, setCoordinates] = useState(DEFAULT_COORDINATES);
  const [draftCoordinates, setDraftCoordinates] = useState({
    latitude: String(DEFAULT_COORDINATES.latitude.toFixed(4)),
    longitude: String(DEFAULT_COORDINATES.longitude.toFixed(4))
  });
  const [forecast, setForecast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const statusTimerRef = useRef();

  const fetchForecast = useCallback(
    async (coords, { silent = false } = {}) => {
      if (!silent) {
        setIsLoading(true);
      }
      setErrorMessage('');
      try {
        const params = new URLSearchParams({
          lat: coords.latitude.toFixed(4),
          lon: coords.longitude.toFixed(4)
        });
        const data = await apiClient.get(`/api/weather?${params.toString()}`);
        setForecast(data);
        setStatusMessage(
          `Updated at ${new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}`
        );
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load weather forecast.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchForecast(DEFAULT_COORDINATES);
  }, [fetchForecast]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = {
          latitude,
          longitude
        };
        setCoordinates(coords);
        setDraftCoordinates({
          latitude: latitude.toFixed(4),
          longitude: longitude.toFixed(4)
        });
        fetchForecast(coords, { silent: true });
      },
      () => {
        // Ignore permission errors silently and keep defaults
      },
      { maximumAge: 1000 * 60 * 10, timeout: 4000 }
    );
  }, [fetchForecast]);

  useEffect(() => {
    if (!statusMessage) {
      return undefined;
    }
    statusTimerRef.current = setTimeout(() => {
      setStatusMessage('');
      statusTimerRef.current = undefined;
    }, 4000);
    return () => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
        statusTimerRef.current = undefined;
      }
    };
  }, [statusMessage]);

  const currentWeather = forecast?.current ?? null;

  const feelsLikeText = useMemo(() => {
    if (!currentWeather) {
      return '';
    }
    const diff = (currentWeather.apparentTemperature ?? 0) - (currentWeather.temperature ?? 0);
    if (Math.abs(diff) < 1) {
      return 'Feels like the actual temperature.';
    }
    if (diff > 0) {
      return `Feels ${Math.round(diff)}° warmer.`;
    }
    return `Feels ${Math.abs(Math.round(diff))}° cooler.`;
  }, [currentWeather]);

  const hourlyPreview = useMemo(() => {
    if (!forecast?.hourly) {
      return [];
    }
    return forecast.hourly.slice(0, 8).map((entry) => {
      const code = interpretWeatherCode(entry.weatherCode);
      return {
        time: new Date(entry.at).toLocaleTimeString([], { hour: 'numeric' }),
        icon: code.icon,
        temperature: entry.temperature !== null ? Math.round(entry.temperature) : null,
        precipitation: entry.precipitationProbability
      };
    });
  }, [forecast]);

  const handleCoordinateChange = (event) => {
    const { name, value } = event.target;
    setDraftCoordinates((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleCoordinateSubmit = (event) => {
    event.preventDefault();
    const lat = parseNumberInput(draftCoordinates.latitude);
    const lon = parseNumberInput(draftCoordinates.longitude);
    if (lat === '' || lon === '') {
      setErrorMessage('Enter valid latitude and longitude values.');
      return;
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setErrorMessage('Coordinates must be within valid ranges.');
      return;
    }
    const next = { latitude: lat, longitude: lon };
    setCoordinates(next);
    setDraftCoordinates({
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4)
    });
    setIsRefreshing(true);
    fetchForecast(next);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchForecast(coordinates);
  };

  const currentCode = interpretWeatherCode(currentWeather?.weatherCode);

  return (
    <section className="dashboard-card weather-card">
      <header className="weather-header">
        <div>
          <h2 className="section-title">Weather</h2>
          <p className="weather-meta">
            {forecast?.location
              ? `${forecast.location.latitude.toFixed(2)}, ${forecast.location.longitude.toFixed(2)} • ${forecast.location.timezone}`
              : 'Local conditions'}
          </p>
        </div>
        <div className="weather-meta">
          {statusMessage ? (
            <span className="weather-status" role="status">
              {statusMessage}
            </span>
          ) : null}
          <button type="button" onClick={handleRefresh} disabled={isRefreshing || isLoading}>
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      <form className="weather-search" onSubmit={handleCoordinateSubmit}>
        <label>
          Latitude
          <input
            type="number"
            step="0.0001"
            name="latitude"
            value={draftCoordinates.latitude}
            onChange={handleCoordinateChange}
          />
        </label>
        <label>
          Longitude
          <input
            type="number"
            step="0.0001"
            name="longitude"
            value={draftCoordinates.longitude}
            onChange={handleCoordinateChange}
          />
        </label>
        <button type="submit" disabled={isRefreshing || isLoading}>
          Update
        </button>
      </form>

      {errorMessage ? (
        <p className="weather-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {isLoading && !forecast ? (
        <p className="weather-empty" role="status">
          Fetching forecast…
        </p>
      ) : null}

      {forecast ? (
        <div className="weather-content">
          <div className="weather-current">
            <span className="weather-icon" role="img" aria-label={currentCode.label}>
              {currentCode.icon}
            </span>
            <div>
              <p className="weather-temp">
                {currentWeather?.temperature !== undefined
                  ? Math.round(currentWeather.temperature)
                  : '--'}
                <span>°F</span>
              </p>
              <p className="weather-condition">{currentCode.label}</p>
              <p className="weather-feels">{feelsLikeText}</p>
            </div>
          </div>

          <dl className="weather-details">
            <div>
              <dt>Feels like</dt>
              <dd>
                {currentWeather?.apparentTemperature !== undefined
                  ? `${Math.round(currentWeather.apparentTemperature)} °F`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Wind</dt>
              <dd>
                {currentWeather?.windSpeed !== undefined
                  ? `${Math.round(currentWeather.windSpeed)} mph`
                  : '—'}
              </dd>
            </div>
          </dl>

          <section className="weather-hourly">
            <h3>Next hours</h3>
            {hourlyPreview.length === 0 ? (
              <p className="weather-empty">No hourly data available.</p>
            ) : (
              <ul>
                {hourlyPreview.map((hour, index) => (
                  <li key={`${hour.time}-${index}`}>
                    <span>{hour.time}</span>
                    <span role="img" aria-label="conditions">
                      {hour.icon}
                    </span>
                    <span>{hour.temperature !== null ? `${hour.temperature}°` : '--'}</span>
                    <span>{hour.precipitation ?? 0}%</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

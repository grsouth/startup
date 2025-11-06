const express = require('express');

const { buildEnvelope } = require('../response');

const router = express.Router();

const METEO_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : null;
};

const validateCoordinates = (lat, lon) => {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return 'Latitude must be between -90 and 90';
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    return 'Longitude must be between -180 and 180';
  }
  return null;
};

router.get('/weather', async (req, res, next) => {
  try {
    const lat = parseNumber(req.query?.lat);
    const lon = parseNumber(req.query?.lon);

    if (lat === null || lon === null) {
      res
        .status(400)
        .json(buildEnvelope(null, 'Query parameters lat and lon are required'));
      return;
    }

    const coordinateError = validateCoordinates(lat, lon);
    if (coordinateError) {
      res.status(400).json(buildEnvelope(null, coordinateError));
      return;
    }

    const url = new URL(METEO_ENDPOINT);
    url.searchParams.set('latitude', lat.toFixed(4));
    url.searchParams.set('longitude', lon.toFixed(4));
    url.searchParams.set(
      'current',
      'temperature_2m,apparent_temperature,weather_code,wind_speed_10m'
    );
    url.searchParams.set(
      'hourly',
      'temperature_2m,apparent_temperature,weather_code,precipitation_probability'
    );
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('windspeed_unit', 'mph');
    url.searchParams.set('precipitation_unit', 'inch');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'startup-service/1.0'
      }
    });

    if (!response.ok) {
      res
        .status(502)
        .json(
          buildEnvelope(
            null,
            `Weather upstream error (${response.status} ${response.statusText})`
          )
        );
      return;
    }

    const payload = await response.json();

    const formatCurrent = (data) => {
      const current = data.current || {};
      return {
        at: current.time,
        temperature: current.temperature_2m,
        apparentTemperature: current.apparent_temperature,
        weatherCode: current.weather_code,
        windSpeed: current.wind_speed_10m
      };
    };

    const formatHourly = (data) => {
      const hourly = data.hourly || {};
      const times = hourly.time || [];
      return times.slice(0, 12).map((time, index) => ({
        at: time,
        temperature: hourly.temperature_2m?.[index] ?? null,
        apparentTemperature: hourly.apparent_temperature?.[index] ?? null,
        weatherCode: hourly.weather_code?.[index] ?? null,
        precipitationProbability: hourly.precipitation_probability?.[index] ?? null
      }));
    };

    res.json(
      buildEnvelope({
        location: {
          latitude: payload.latitude,
          longitude: payload.longitude,
          timezone: payload.timezone
        },
        current: formatCurrent(payload),
        hourly: formatHourly(payload)
      })
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;

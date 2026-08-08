const axios = require('axios');

exports.getWeather = async (req, res, next) => {
  try {
    const { location } = req.query;
    if (!location) return res.status(400).json({ message: 'Location is required.' });

    const apiKey = process.env.WEATHER_API_KEY;

    if (!apiKey || apiKey === 'your_openweathermap_api_key') {
      // Return mock weather data for development
      return res.json({
        location,
        source: 'mock',
        current: {
          temperature: 28 + Math.round(Math.random() * 10),
          condition: ['Clear', 'Cloudy', 'Partly Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)],
          humidity: 50 + Math.round(Math.random() * 40),
          windSpeed: Math.round(Math.random() * 20),
          icon: '01d',
        },
        forecast: Array.from({ length: 5 }, (_, i) => ({
          date: new Date(Date.now() + (i + 1) * 86400000).toISOString().split('T')[0],
          temperature: { min: 22 + Math.round(Math.random() * 5), max: 30 + Math.round(Math.random() * 8) },
          condition: ['Clear', 'Cloudy', 'Rain', 'Thunderstorm'][Math.floor(Math.random() * 4)],
          rainChance: Math.round(Math.random() * 100),
        })),
        alerts: [],
      });
    }

    // Real API call
    const currentRes = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`
    );
    const forecastRes = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`
    );

    const current = currentRes.data;
    const forecast = forecastRes.data;

    // Check for rain alerts
    const alerts = [];
    const rainForecast = forecast.list.filter(f =>
      f.weather.some(w => w.main === 'Rain' || w.main === 'Thunderstorm')
    );
    if (rainForecast.length > 0) {
      alerts.push({
        type: 'rain',
        message: `Rain expected on ${new Date(rainForecast[0].dt * 1000).toLocaleDateString()}`,
        severity: rainForecast[0].weather[0].main === 'Thunderstorm' ? 'high' : 'medium',
      });
    }

    res.json({
      location,
      source: 'openweathermap',
      current: {
        temperature: Math.round(current.main.temp),
        condition: current.weather[0].description,
        humidity: current.main.humidity,
        windSpeed: current.wind.speed,
        icon: current.weather[0].icon,
      },
      forecast: forecast.list.filter((_, i) => i % 8 === 0).slice(0, 5).map(f => ({
        date: new Date(f.dt * 1000).toISOString().split('T')[0],
        temperature: { min: Math.round(f.main.temp_min), max: Math.round(f.main.temp_max) },
        condition: f.weather[0].description,
        rainChance: f.pop ? Math.round(f.pop * 100) : 0,
      })),
      alerts,
    });
  } catch (error) {
    // Fallback to mock on API failure
    res.json({
      location: req.query.location,
      source: 'mock_fallback',
      current: { temperature: 30, condition: 'Clear', humidity: 60, windSpeed: 10 },
      forecast: [],
      alerts: [],
      error: error.message,
    });
  }
};

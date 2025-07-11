import React, { useState, useEffect } from 'react';
import { MapPin, Thermometer, Calendar, Bell, AlertTriangle, Mail, Phone, Search, Settings, X } from 'lucide-react';

// Configuration constants
const ACCUWEATHER_API_KEY = 'DmENIBqYeAKupCz3VQAwbVJvol8kzLHE';
const ALERT_CHECK_INTERVAL = 300000; // 5 minutes
const DEFAULT_TEMPERATURE_THRESHOLD = 35;

const EuropeWeatherApp = () => {
  const [activeTab, setActiveTab] = useState('current');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertSettings, setAlertSettings] = useState({
    email: '',
    phone: '',
    temperatureThreshold: DEFAULT_TEMPERATURE_THRESHOLD,
    cities: []
  });
  const [showAlertSetup, setShowAlertSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(ACCUWEATHER_API_KEY);
  const [showApiSetup, setShowApiSetup] = useState(false);
  const [heatMapData, setHeatMapData] = useState([]);
  const [selectedLocationKey, setSelectedLocationKey] = useState('');
  const [error, setError] = useState('');

  // Major European cities for heat map
  const europeanCities = [
    { name: 'Madrid', country: 'Spain', lat: 40.4165, lon: -3.7026 },
    { name: 'Athens', country: 'Greece', lat: 37.9838, lon: 23.7275 },
    { name: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964 },
    { name: 'Barcelona', country: 'Spain', lat: 41.3851, lon: 2.1734 },
    { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
    { name: 'Vienna', country: 'Austria', lat: 48.2082, lon: 16.3738 },
    { name: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050 },
    { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041 },
    { name: 'London', country: 'UK', lat: 51.5074, lon: -0.1278 },
    { name: 'Stockholm', country: 'Sweden', lat: 59.3293, lon: 18.0686 }
  ];

  // AccuWeather API functions
  const searchLocationByName = async (cityName) => {
    if (!apiKey) {
      setError('Please configure your AccuWeather API key first');
      return null;
    }

    try {
      const response = await fetch(
        `https://dataservice.accuweather.com/locations/v1/cities/search?apikey=${apiKey}&q=${encodeURIComponent(cityName)}&details=true`
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.length === 0) {
        throw new Error('Location not found');
      }
      
      return data[0];
    } catch (error) {
      console.error('Error searching location:', error);
      setError(`Error searching location: ${error.message}`);
      return null;
    }
  };

  const getCurrentWeather = async (locationKey) => {
    if (!apiKey) {
      setError('Please configure your AccuWeather API key first');
      return null;
    }

    try {
      const response = await fetch(
        `https://dataservice.accuweather.com/currentconditions/v1/${locationKey}?apikey=${apiKey}&details=true`
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.length === 0) {
        throw new Error('No weather data available');
      }
      
      const weather = data[0];
      return {
        temp: Math.round(weather.Temperature.Metric.Value),
        condition: weather.WeatherText,
        humidity: weather.RelativeHumidity,
        wind: Math.round(weather.Wind.Speed.Metric.Value),
        realFeelTemp: Math.round(weather.RealFeelTemperature.Metric.Value),
        uvIndex: weather.UVIndex,
        visibility: Math.round(weather.Visibility.Metric.Value),
        pressure: Math.round(weather.Pressure.Metric.Value),
        dewPoint: Math.round(weather.DewPoint.Metric.Value),
        cloudCover: weather.CloudCover
      };
    } catch (error) {
      console.error('Error fetching current weather:', error);
      setError(`Error fetching weather: ${error.message}`);
      return null;
    }
  };

  const getForecast = async (locationKey) => {
    if (!apiKey) {
      setError('Please configure your AccuWeather API key first');
      return [];
    }

    try {
      const response = await fetch(
        `https://dataservice.accuweather.com/forecasts/v1/daily/5day/${locationKey}?apikey=${apiKey}&details=true&metric=true`
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.DailyForecasts.map((day, index) => ({
        day: index === 0 ? 'Today' : new Date(day.Date).toLocaleDateString('en-US', { weekday: 'short' }),
        date: new Date(day.Date).toLocaleDateString(),
        temp: Math.round(day.Temperature.Maximum.Value),
        tempMin: Math.round(day.Temperature.Minimum.Value),
        condition: day.Day.IconPhrase,
        realFeelTemp: Math.round(day.RealFeelTemperature.Maximum.Value),
        precipitationProbability: day.Day.PrecipitationProbability
      }));
    } catch (error) {
      console.error('Error fetching forecast:', error);
      setError(`Error fetching forecast: ${error.message}`);
      return [];
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a city name');
      return;
    }

    if (!apiKey) {
      setError('Please configure your AccuWeather API key first');
      setShowApiSetup(true);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const locationData = await searchLocationByName(searchQuery);
      
      if (!locationData) {
        setLoading(false);
        return;
      }
      
      setSelectedLocation(`${locationData.LocalizedName}, ${locationData.Country.LocalizedName}`);
      setSelectedLocationKey(locationData.Key);
      
      // Fetch current weather and forecast
      const [weatherData, forecastData] = await Promise.all([
        getCurrentWeather(locationData.Key),
        getForecast(locationData.Key)
      ]);
      
      if (weatherData) {
        setCurrentWeather(weatherData);
      }
      
      if (forecastData.length > 0) {
        setForecast(forecastData);
      }
      
      setActiveTab('current');
    } catch (error) {
      console.error('Error in search:', error);
      setError(`Search failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadHeatMapData = async () => {
    if (!apiKey) {
      setError('Please configure your AccuWeather API key first');
      setShowApiSetup(true);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const heatMapPromises = europeanCities.map(async (city) => {
        try {
          const locationData = await searchLocationByName(`${city.name}, ${city.country}`);
          if (!locationData) return null;
          
          const weatherData = await getCurrentWeather(locationData.Key);
          if (!weatherData) return null;
          
          const temp = weatherData.temp;
          const severity = temp >= 40 ? 'extreme' : temp >= 35 ? 'high' : temp >= 30 ? 'moderate' : 'low';
          
          return {
            city: city.name,
            country: city.country,
            temp,
            severity,
            condition: weatherData.condition,
            locationKey: locationData.Key
          };
        } catch (error) {
          console.error(`Error fetching data for ${city.name}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(heatMapPromises);
      const validResults = results.filter(result => result !== null);
      
      setHeatMapData(validResults);
      
      if (validResults.length === 0) {
        setError('No heat map data could be loaded');
      }
    } catch (error) {
      console.error('Error loading heat map:', error);
      setError(`Error loading heat map: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addAlert = () => {
    if (selectedLocation && alertSettings.email) {
      const newAlert = {
        id: Date.now(),
        city: selectedLocation,
        threshold: alertSettings.temperatureThreshold,
        email: alertSettings.email,
        phone: alertSettings.phone,
        active: true,
        locationKey: selectedLocationKey
      };
      setAlerts([...alerts, newAlert]);
      setShowAlertSetup(false);
      
      // Reset form
      setAlertSettings({
        email: '',
        phone: '',
        temperatureThreshold: DEFAULT_TEMPERATURE_THRESHOLD,
        cities: []
      });
    }
  };

  const checkAlerts = () => {
    const triggeredAlerts = alerts.filter(alert => {
      // Check if current weather data exists and temperature exceeds threshold
      if (currentWeather && selectedLocation === alert.city) {
        return currentWeather.temp > alert.threshold;
      }
      
      // Check heat map data for other cities
      const cityData = heatMapData.find(city => 
        `${city.city}, ${city.country}` === alert.city
      );
      return cityData && cityData.temp > alert.threshold;
    });
    return triggeredAlerts;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'extreme': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'moderate': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getTemperatureColor = (temp) => {
    if (temp >= 40) return 'text-red-600';
    if (temp >= 35) return 'text-orange-500';
    if (temp >= 30) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const saveApiKey = () => {
    if (apiKey.trim()) {
      setShowApiSetup(false);
      setError('');
    }
  };

  const removeAlert = (alertId) => {
    setAlerts(alerts.filter(a => a.id !== alertId));
  };

  // Load heat map data when switching to heat map tab
  useEffect(() => {
    if (activeTab === 'heatmap' && heatMapData.length === 0 && apiKey) {
      loadHeatMapData();
    }
  }, [activeTab, heatMapData.length, apiKey]);

  // Check for alerts periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const triggered = checkAlerts();
      if (triggered.length > 0) {
        console.log('Heat wave alerts triggered:', triggered);
        // In a real app, you'd send actual notifications here
      }
    }, ALERT_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [alerts, currentWeather, heatMapData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Thermometer className="h-8 w-8 text-orange-500" />
              <h1 className="text-2xl font-bold text-gray-800">European Heat Wave Monitor</h1>
            </div>
            <div className="flex items-center space-x-4">
              {loading && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Loading...</span>
                </div>
              )}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter European city..."
                  className="pl-10 pr-4 py-2 border rounded-lg w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              <button
                onClick={searchLocation}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                Search
              </button>
              <button
                onClick={() => setShowApiSetup(true)}
                className="px-3 py-2 text-gray-600 hover:text-gray-800"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-800">{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* API Key Notice */}
        {!apiKey && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div className="text-yellow-800">
                <div className="font-semibold">API Key Required</div>
                <div className="text-sm">
                  Please configure your AccuWeather API key to use real weather data.
                  <button
                    onClick={() => setShowApiSetup(true)}
                    className="ml-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Configure now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alert Summary */}
        {checkAlerts().length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-semibold">
                {checkAlerts().length} Heat Wave Alert{checkAlerts().length > 1 ? 's' : ''} Active
              </span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 ${
                activeTab === 'current' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
              }`}
            >
              <MapPin className="h-5 w-5" />
              <span>Current Weather</span>
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 ${
                activeTab === 'heatmap' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
              }`}
            >
              <Thermometer className="h-5 w-5" />
              <span>Heat Map</span>
            </button>
            <button
              onClick={() => setActiveTab('forecast')}
              className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 ${
                activeTab === 'forecast' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
              }`}
            >
              <Calendar className="h-5 w-5" />
              <span>5-Day Forecast</span>
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 ${
                activeTab === 'alerts' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
              }`}
            >
              <Bell className="h-5 w-5" />
              <span>Alerts ({alerts.length})</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'current' && (
              <div>
                {currentWeather ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-lg p-6">
                      <h2 className="text-xl font-bold mb-4">{selectedLocation}</h2>
                      <div className="flex items-center space-x-4 mb-4">
                        <div className={`text-4xl font-bold ${getTemperatureColor(currentWeather.temp)}`}>
                          {currentWeather.temp}°C
                        </div>
                        <div className="text-gray-600">{currentWeather.condition}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>Humidity: {currentWeather.humidity}%</div>
                        <div>Wind: {currentWeather.wind} km/h</div>
                        <div>Feels like: {currentWeather.realFeelTemp}°C</div>
                        <div>UV Index: {currentWeather.uvIndex}</div>
                        <div>Visibility: {currentWeather.visibility} km</div>
                        <div>Pressure: {currentWeather.pressure} mb</div>
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-6">
                      <h3 className="font-semibold mb-4">Heat Wave Status</h3>
                      <div className="space-y-2">
                        <div className={`p-3 rounded-lg ${
                          currentWeather.temp >= 40 ? 'bg-red-100 text-red-800' :
                          currentWeather.temp >= 35 ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          <div className="font-semibold">
                            {currentWeather.temp >= 40 ? 'Extreme Heat Warning' :
                             currentWeather.temp >= 35 ? 'Heat Wave Alert' :
                             'Normal Temperature'}
                          </div>
                          <div className="text-sm mt-1">
                            {currentWeather.temp >= 40 ? 'Dangerous conditions. Avoid outdoor activities.' :
                             currentWeather.temp >= 35 ? 'High temperature. Stay hydrated and seek shade.' :
                             'Comfortable weather conditions.'}
                          </div>
                        </div>
                        <button
                          onClick={() => setShowAlertSetup(true)}
                          className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          Set Temperature Alert
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {!apiKey ? 'Configure your API key and search for a European city' : 'Search for a European city to see current weather'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'heatmap' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">European Heat Map</h2>
                  <button
                    onClick={loadHeatMapData}
                    disabled={loading || !apiKey}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Refresh Data'}
                  </button>
                </div>
                {heatMapData.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {heatMapData.map((city, index) => (
                      <div key={index} className="bg-white rounded-lg shadow-md p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{city.city}</h3>
                          <div className={`w-3 h-3 rounded-full ${getSeverityColor(city.severity)}`}></div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">{city.country}</div>
                        <div className={`text-2xl font-bold ${getTemperatureColor(city.temp)}`}>
                          {city.temp}°C
                        </div>
                        <div className="text-sm text-gray-600">{city.condition}</div>
                        <div className="text-xs text-gray-500 mt-2 capitalize">
                          {city.severity} heat level
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Thermometer className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {!apiKey ? 'Configure your API key to load the heat map' : 'Click "Refresh Data" to load the heat map'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'forecast' && (
              <div>
                <h2 className="text-xl font-bold mb-6">5-Day Forecast</h2>
                {forecast.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {forecast.map((day, index) => (
                      <div key={index} className="bg-white rounded-lg shadow-md p-4">
                        <div className="font-semibold text-center mb-2">{day.day}</div>
                        <div className="text-sm text-gray-600 text-center mb-2">{day.date}</div>
                        <div className={`text-2xl font-bold text-center ${getTemperatureColor(day.temp)}`}>
                          {day.temp}°C
                        </div>
                        <div className="text-sm text-gray-600 text-center">{day.tempMin}°C</div>
                        <div className="text-sm text-gray-600 text-center mt-2">{day.condition}</div>
                        <div className="text-xs text-gray-500 text-center mt-1">
                          Rain: {day.precipitationProbability}%
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {!apiKey ? 'Configure your API key and search for a city' : 'Search for a city to see the 5-day forecast'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'alerts' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Temperature Alerts</h2>
                  <button
                    onClick={() => setShowAlertSetup(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Add Alert
                  </button>
                </div>
                {alerts.length > 0 ? (
                  <div className="space-y-4">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="bg-white rounded-lg shadow-md p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{alert.city}</div>
                            <div className="text-sm text-gray-600">
                              Alert when temperature exceeds {alert.threshold}°C
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Email: {alert.email}
                              {alert.phone && ` | Phone: ${alert.phone}`}
                            </div>
                          </div>
                          <button
                            onClick={() => removeAlert(alert.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No temperature alerts set up yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Alert Setup Modal */}
        {showAlertSetup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Set Temperature Alert</h3>
                <button
                  onClick={() => setShowAlertSetup(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <input
                    type="text"
                    value={selectedLocation}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Temperature Threshold (°C)</label>
                  <input
                    type="number"
                    value={alertSettings.temperatureThreshold}
                    onChange={(e) => setAlertSettings({...alertSettings, temperatureThreshold: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                    max="50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address</label>
                  <input
                    type="email"
                    value={alertSettings.email}
                    onChange={(e) => setAlertSettings({...alertSettings, email: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number (optional)</label>
                  <input
                    type="tel"
                    value={alertSettings.phone}
                    onChange={(e) => setAlertSettings({...alertSettings, phone: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="+1234567890"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowAlertSetup(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addAlert}
                    disabled={!selectedLocation || !alertSettings.email}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    Save Alert
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Key Setup Modal */}
        {showApiSetup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Configure API Key</h3>
                <button
                  onClick={() => setShowApiSetup(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">AccuWeather API Key</label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Enter your AccuWeather API key"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get your free API key from{' '}
                    <a 
                      href="https://developer.accuweather.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      AccuWeather Developer Portal
                    </a>
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowApiSetup(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveApiKey}
                    disabled={!apiKey.trim()}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    Save API Key
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EuropeWeatherApp;
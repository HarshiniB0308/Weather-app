/**
 * DOM Elements
 */
const dynamicBg = document.getElementById('dynamic-bg');
// Navigation
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const navbar = document.querySelector('.navbar');

// Search and Form
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const locationBtn = document.getElementById('location-btn');

// Display Sections
const weatherDisplay = document.getElementById('weather-display');
const loadingSpinner = document.getElementById('loading-spinner');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

// Weather Data Elements
const cityNameEl = document.getElementById('city-name');
const currentDateEl = document.getElementById('current-date');
const temperatureEl = document.getElementById('temperature');
const tempUnitEl = document.getElementById('temp-unit');
const weatherIconMain = document.getElementById('weather-icon-main');
const weatherDescriptionEl = document.getElementById('weather-description');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');
const feelsLikeEl = document.getElementById('feels-like');

// Unit Toggle
const unitCBtn = document.getElementById('unit-c');
const unitFBtn = document.getElementById('unit-f');

// Global State
let currentWeatherData = null;
let currentUnit = 'C'; // 'C' or 'F'

/**
 * Event Listeners
 */
document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Sticky navbar effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.boxShadow = 'none';
        }
    });

    // Form Submissions
    searchForm.addEventListener('submit', handleSearch);
    document.getElementById('contact-form').addEventListener('submit', handleContactForm);

    // Geolocation
    locationBtn.addEventListener('click', getUserLocation);

    // Unit Toggles
    unitCBtn.addEventListener('click', () => setUnit('C'));
    unitFBtn.addEventListener('click', () => setUnit('F'));

    // FAQ Accordion
    setupAccordion();
});

/**
 * Search Logic
 */
async function handleSearch(e) {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (!city) return;

    showLoading();
    try {
        // 1. Get Coordinates from City Name using Open-Meteo Geocoding
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City not found. Please try another name.');
        }

        const { latitude, longitude, name, country } = geoData.results[0];
        
        // 2. Fetch Weather Data using Coordinates
        await fetchWeatherData(latitude, longitude, `${name}, ${country}`);

    } catch (error) {
        showError(error.message || 'Failed to fetch weather data.');
    }
}

/**
 * Geolocation Logic
 */
function getUserLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser.');
        return;
    }

    showLoading();
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                // Try to reverse geocode using a free API or just use coordinates
                // Since Open-Meteo reverse geocoding isn't explicitly simple without another endpoint, 
                // we'll fetch weather directly and label it 'Your Location'
                await fetchWeatherData(latitude, longitude, 'Your Location');
            } catch (error) {
                showError('Failed to fetch weather for your location.');
            }
        },
        () => {
            showError('Unable to retrieve your location. Permission denied?');
        }
    );
}

/**
 * Fetch Weather Data from Open-Meteo
 */
async function fetchWeatherData(lat, lon, locationName) {
    try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&timezone=auto`;
        const res = await fetch(weatherUrl);
        if (!res.ok) throw new Error('Weather API error.');
        const data = await res.json();
        
        currentWeatherData = {
            name: locationName,
            tempC: data.current.temperature_2m,
            feelsLikeC: data.current.apparent_temperature,
            humidity: data.current.relative_humidity_2m,
            windSpeed: data.current.wind_speed_10m,
            isDay: data.current.is_day,
            weatherCode: data.current.weather_code,
            time: data.current.time // ISO string
        };

        updateUI();
    } catch (error) {
        showError("Failed to load weather data.");
    }
}

/**
 * Update the DOM with fetched data
 */
function updateUI() {
    if (!currentWeatherData) return;

    hideLoadingWrapper();
    weatherDisplay.style.display = 'block';

    const { name, tempC, feelsLikeC, humidity, windSpeed, isDay, weatherCode, time } = currentWeatherData;

    // Location & Date
    cityNameEl.textContent = name;
    const dateObj = new Date(time);
    currentDateEl.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    // Weather Mapping
    const weatherInfo = mapWeatherCode(weatherCode, isDay);
    weatherDescriptionEl.textContent = weatherInfo.description;
    weatherIconMain.className = `bx ${weatherInfo.icon}`;
    
    // Background Update
    updateBackground(weatherInfo.bgClass, isDay);

    // Other details
    humidityEl.textContent = `${humidity}%`;
    windSpeedEl.textContent = `${windSpeed} km/h`;

    // Apply Temperatures based on current unit
    renderTemperatures();
}

/**
 * Temperature Rendering and Unit Toggles
 */
function renderTemperatures() {
    if (!currentWeatherData) return;
    
    let displayTemp, displayFeelsLike, unitStr;

    if (currentUnit === 'C') {
        displayTemp = currentWeatherData.tempC;
        displayFeelsLike = currentWeatherData.feelsLikeC;
        unitStr = '°C';
    } else {
        displayTemp = (currentWeatherData.tempC * 9/5) + 32;
        displayFeelsLike = (currentWeatherData.feelsLikeC * 9/5) + 32;
        unitStr = '°F';
    }

    temperatureEl.textContent = Math.round(displayTemp);
    tempUnitEl.textContent = unitStr;
    feelsLikeEl.textContent = `${Math.round(displayFeelsLike)}°`;
}

function setUnit(unit) {
    if (unit === currentUnit) return;
    currentUnit = unit;
    
    if (unit === 'C') {
        unitCBtn.classList.add('active');
        unitFBtn.classList.remove('active');
    } else {
        unitFBtn.classList.add('active');
        unitCBtn.classList.remove('active');
    }
    
    renderTemperatures();
}

/**
 * Weather Code Mapping (WMO Code)
 */
function mapWeatherCode(code, isDay) {
    // Default
    let desc = "Unknown";
    let icon = "bx-cloud";
    let bgClass = "bg-cloudy";

    if (code === 0) {
        desc = "Clear sky";
        icon = isDay ? "bx-sun" : "bx-moon";
        bgClass = isDay ? "bg-sunny" : "bg-clear-night";
    } else if (code === 1 || code === 2 || code === 3) {
        desc = ["Mainly clear", "Partly cloudy", "Overcast"][code - 1];
        icon = isDay ? "bx-cloud" : "bx-cloud";
        bgClass = "bg-cloudy";
    } else if (code === 45 || code === 48) {
        desc = "Foggy";
        icon = "bx-water";
        bgClass = "bg-cloudy";
    } else if (code >= 51 && code <= 55) {
        desc = "Drizzle";
        icon = "bx-cloud-drizzle";
        bgClass = "bg-rainy";
    } else if (code >= 61 && code <= 65) {
        desc = "Rain";
        icon = "bx-cloud-rain";
        bgClass = "bg-rainy";
    } else if (code >= 71 && code <= 77) {
        desc = "Snow";
        icon = "bx-cloud-snow";
        bgClass = "bg-snowy";
    } else if (code >= 80 && code <= 82) {
        desc = "Rain showers";
        icon = "bx-cloud-rain";
        bgClass = "bg-rainy";
    } else if (code >= 85 && code <= 86) {
        desc = "Snow showers";
        icon = "bx-cloud-snow";
        bgClass = "bg-snowy";
    } else if (code >= 95 && code <= 99) {
        desc = "Thunderstorm";
        icon = "bx-cloud-lightning";
        bgClass = "bg-rainy";
    }

    return { description: desc, icon: icon, bgClass: bgClass };
}

function updateBackground(bgClass, isDay) {
    // Remove all bg- classes
    dynamicBg.className = '';
    dynamicBg.classList.add(bgClass);

    // Handle dark mode typography if it's night or dark background
    if (!isDay || bgClass === 'bg-rainy' || bgClass === 'bg-clear-night') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

/**
 * UI State Helpers
 */
function showLoading() {
    weatherDisplay.style.display = 'none';
    errorMessage.style.display = 'none';
    loadingSpinner.style.display = 'block';
}

function hideLoadingWrapper() {
    loadingSpinner.style.display = 'none';
    errorMessage.style.display = 'none';
}

function showError(msg) {
    weatherDisplay.style.display = 'none';
    loadingSpinner.style.display = 'none';
    errorMessage.style.display = 'block';
    errorText.textContent = msg;
}

/**
 * FAQ Accordion Setup
 */
function setupAccordion() {
    const items = document.querySelectorAll('.accordion-item');
    items.forEach(item => {
        const header = item.querySelector('.accordion-header');
        header.addEventListener('click', () => {
            // Close others
            items.forEach(other => {
                if (other !== item) other.classList.remove('active');
            });
            // Toggle current
            item.classList.toggle('active');
        });
    });
}

/**
 * Mock Contact Form Submit
 */
function handleContactForm(e) {
    e.preventDefault();
    const btn = document.getElementById('contact-submit');
    const msg = document.getElementById('contact-success');
    
    btn.textContent = 'Sending...';
    btn.disabled = true;

    // Simulate network delay
    setTimeout(() => {
        btn.textContent = 'Send Message';
        btn.disabled = false;
        msg.style.display = 'block';
        document.getElementById('contact-form').reset();
        
        setTimeout(() => {
            msg.style.display = 'none';
        }, 5000);
    }, 1500);
}

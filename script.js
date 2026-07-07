// OpenWeatherMap Weather Dashboard Controller
const API_KEY = "cc770f7018b4f95110b741b118baad06";

// State Management
let currentCity = "London";
let currentUnit = "metric"; // 'metric' for Celsius, 'imperial' for Fahrenheit
let hourlyChart;
let autoHideTimeout;

// DOM Elements
const form = document.getElementById("weather-form");
const cityInput = document.getElementById("city");
const unitToggle = document.getElementById("unit-toggle");
const unitC = document.getElementById("unit-c");
const unitF = document.getElementById("unit-f");
const notification = document.getElementById("notification");
const notificationMsg = document.getElementById("notification-message");
const notificationClose = document.getElementById("notification-close");

// Initialization
window.addEventListener("DOMContentLoaded", () => {
  updateCurrentDate();
  fetchWeatherData(currentCity);
});

// Event Listeners
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) {
    fetchWeatherData(city);
  }
});

unitToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".toggle-btn");
  if (!btn || btn.classList.contains("active")) return;

  // Toggle buttons visual state
  document.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  // Update state and re-fetch
  currentUnit = btn.id === "unit-c" ? "metric" : "imperial";
  fetchWeatherData(currentCity);
});

notificationClose.addEventListener("click", hideError);

// Update Date Badge
function updateCurrentDate() {
  const dateBadge = document.getElementById("current-date");
  if (dateBadge) {
    const options = { weekday: "long", month: "short", day: "numeric" };
    dateBadge.textContent = new Date().toLocaleDateString(undefined, options);
  }
}

// Inline Notification Banner Helper
function showError(message) {
  notificationMsg.textContent = message;
  notification.classList.remove("hidden");
  
  // Clear any existing timeout
  if (autoHideTimeout) clearTimeout(autoHideTimeout);
  
  // Auto dismiss after 6 seconds
  autoHideTimeout = setTimeout(hideError, 6000);
}

function hideError() {
  notification.classList.add("hidden");
}

// Unified Fetch and Render controller
async function fetchWeatherData(city) {
  try {
    const hasWeather = await fetchWeather(city);
    if (hasWeather) {
      currentCity = city; // update state only on success
      await fetchHourly(city);
    }
  } catch (err) {
    console.error(err);
    showError("Something went wrong. Please check your internet connection.");
  }
}

// Fetch Current Weather
async function fetchWeather(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${currentUnit}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.cod != 200) {
    showError(`City not found: "${city}". Please try another search.`);
    return false;
  }

  // Update Main Info
  const isMetric = currentUnit === "metric";
  document.querySelector(".temp").textContent = `${Math.round(data.main.temp)}${isMetric ? "°C" : "°F"}`;
  document.querySelector(".location").textContent = `${data.name}, ${data.sys.country}`;
  document.querySelector(".condition").textContent = data.weather[0].description;

  // Update Extra Stats
  document.getElementById("wind").textContent = `${Math.round(data.wind.speed)} ${isMetric ? "m/s" : "mph"}`;
  document.getElementById("humidity").textContent = `${data.main.humidity}%`;
  document.getElementById("pressure").textContent = `${data.main.pressure} hPa`;

  // Update Weather Icon
  const iconCode = data.weather[0].icon;
  const iconImg = document.getElementById("current-icon");
  iconImg.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
  iconImg.alt = data.weather[0].main;

  hideError(); // clear any existing errors if success
  return true;
}

// Fetch 5-Day/3-Hour Forecast
async function fetchHourly(city) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${currentUnit}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.cod !== "200") return;

  // Render 24 Hours line-graph (8 records * 3h intervals)
  const forecastSlice = data.list.slice(0, 8);
  
  const labels = forecastSlice.map(item => {
    const date = new Date(item.dt * 1000);
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  });

  const temps = forecastSlice.map(item => Math.round(item.main.temp));

  drawHourlyChart(labels, temps);
  renderWeeklyForecast(data.list);
}

// Draw Chart.js Visuals
function drawHourlyChart(labels, temps) {
  const ctx = document.getElementById("hourlyChart").getContext("2d");

  if (hourlyChart) hourlyChart.destroy();

  // Create neon cyan gradient for fill
  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, "rgba(6, 182, 212, 0.35)");
  gradient.addColorStop(1, "rgba(6, 182, 212, 0.0)");

  hourlyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Temperature",
        data: temps,
        borderWidth: 3,
        borderColor: "#06b6d4",
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#06b6d4",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 1.5,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#ffffff",
        pointHoverBorderColor: "#06b6d4",
        pointHoverBorderWidth: 2.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(12, 12, 22, 0.85)",
          titleFont: { family: "Outfit", size: 13, weight: "bold" },
          bodyFont: { family: "Inter", size: 12 },
          padding: 10,
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return ` ${context.parsed.y}${currentUnit === 'metric' ? '°C' : '°F'}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#94a3b8", font: { family: "Inter", size: 11 } }
        },
        y: {
          grid: { color: "rgba(255, 255, 255, 0.05)" },
          ticks: {
            color: "#94a3b8",
            font: { family: "Inter", size: 11 },
            callback: function(value) {
              return value + (currentUnit === "metric" ? "°" : "°");
            }
          }
        }
      }
    }
  });
}

// Group 3-hour list items by Day and render forecast
function renderWeeklyForecast(list) {
  const weekly = document.getElementById("weekly-list");
  weekly.innerHTML = "";

  // Group items by day
  const dailyData = {};
  list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dayName = date.toLocaleDateString(undefined, { weekday: "short" });
    
    if (!dailyData[dayName]) {
      dailyData[dayName] = {
        temps: [],
        icons: []
      };
    }
    dailyData[dayName].temps.push(item.main.temp);
    dailyData[dayName].icons.push(item.weather[0].icon);
  });

  // Convert to array of days and display first 5 days
  const days = Object.keys(dailyData);
  days.slice(0, 5).forEach(day => {
    const dayObj = dailyData[day];
    const maxTemp = Math.round(Math.max(...dayObj.temps));
    const minTemp = Math.round(Math.min(...dayObj.temps));
    
    // Find the most frequent icon for this day (mode) to display standard daytime icons
    const iconCounts = {};
    let mostFrequentIcon = dayObj.icons[0];
    let maxCount = 0;
    
    dayObj.icons.forEach(icon => {
      const dayIcon = icon.replace("n", "d"); // map to day version for consistency
      iconCounts[dayIcon] = (iconCounts[dayIcon] || 0) + 1;
      if (iconCounts[dayIcon] > maxCount) {
        maxCount = iconCounts[dayIcon];
        mostFrequentIcon = dayIcon;
      }
    });

    const tempUnitSign = "°";

    weekly.innerHTML += `
      <div class="weekly-item">
        <h4>${day}</h4>
        <img src="https://openweathermap.org/img/wn/${mostFrequentIcon}@2x.png" alt="Weather condition" />
        <div class="temp-range">
          <span class="max-temp">${maxTemp}${tempUnitSign}</span>
          <span class="min-temp">${minTemp}${tempUnitSign}</span>
        </div>
      </div>
    `;
  });
}

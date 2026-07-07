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
  updateGreeting();
  initTiltEffect();
  initWeatherParticles();
  initQuickCities();
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

  // Set the dynamic background glows and particles based on weather type
  updateWeatherTheme(data);

  // Update Main Info
  const isMetric = currentUnit === "metric";
  document.querySelector(".temp").textContent = `${Math.round(data.main.temp)}${isMetric ? "°C" : "°F"}`;
  document.querySelector(".location").textContent = `${data.name}, ${data.sys.country}`;
  document.querySelector(".condition").textContent = data.weather[0].description;

  // Update Extra Stats
  document.getElementById("wind").textContent = `${Math.round(data.wind.speed)} ${isMetric ? "m/s" : "mph"}`;
  document.getElementById("humidity").textContent = `${data.main.humidity}%`;
  document.getElementById("pressure").textContent = `${data.main.pressure} hPa`;

  // Update Gauge and Compass indicators
  updateMetricVisuals(data);

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

  // Detect current line color based on active theme
  const bodyStyle = getComputedStyle(document.body);
  const lineColor = bodyStyle.getPropertyValue('--chart-line-color').trim() || "#06b6d4";
  
  // Set up matching rgba glow colors for fill
  let fillRgba = "rgba(6, 182, 212, 0.25)";
  if (lineColor === "#fb923c") fillRgba = "rgba(251, 146, 60, 0.25)";
  else if (lineColor === "#94a3b8") fillRgba = "rgba(148, 163, 184, 0.25)";
  else if (lineColor === "#0ea5e9") fillRgba = "rgba(14, 165, 233, 0.25)";
  else if (lineColor === "#38bdf8") fillRgba = "rgba(56, 189, 248, 0.25)";
  else if (lineColor === "#8b5cf6") fillRgba = "rgba(139, 92, 246, 0.25)";

  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, fillRgba);
  gradient.addColorStop(1, "rgba(255, 255, 255, 0.0)");

  hourlyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Temperature",
        data: temps,
        borderWidth: 3,
        borderColor: lineColor,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: lineColor,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 1.5,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#ffffff",
        pointHoverBorderColor: lineColor,
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

// Modern Interactive Dashboard Helpers

// 1. Clock-based personalized greetings
function updateGreeting() {
  const greetingEl = document.getElementById("hero-greeting");
  if (!greetingEl) return;
  const hr = new Date().getHours();
  let greet = "Good day! 👋";
  if (hr < 12) {
    greet = "Good morning! 🌅";
  } else if (hr < 17) {
    greet = "Good afternoon! ☀️";
  } else {
    greet = "Good evening! 🌙";
  }
  greetingEl.textContent = greet;
}

// 2. Interactive card 3D tilt effects
function initTiltEffect() {
  const cards = document.querySelectorAll(".card, .hero-section");
  cards.forEach(card => {
    card.addEventListener("mousemove", e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const xc = rect.width / 2;
      const yc = rect.height / 2;
      const dx = x - xc;
      const dy = y - yc;
      
      const maxTilt = 5; // Subtle angle
      const tiltX = -(dy / yc) * maxTilt;
      const tiltY = (dx / xc) * maxTilt;
      
      card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
    });
    
    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
      card.style.transition = "transform 0.5s ease";
    });
    
    card.addEventListener("mouseenter", () => {
      card.style.transition = "transform 0.1s ease";
    });
  });
}

// 3. Dynamic Weather Particles Canvas Overlay
let particleType = "clear";
let particleArray = [];
let particleAnimFrame;

function initWeatherParticles() {
  const canvas = document.getElementById("weather-particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createParticles();
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  
  function createParticles() {
    particleArray = [];
    let numParticles = 25;
    if (particleType === "snow") numParticles = 60;
    else if (particleType === "rain") numParticles = 90;
    else if (particleType === "storm") numParticles = 110;
    else if (particleType === "cloudy") numParticles = 35;
    
    for (let i = 0; i < numParticles; i++) {
      particleArray.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedX: particleType === "rain" || particleType === "storm" ? -1.5 : (Math.random() * 1 - 0.5),
        speedY: particleType === "rain" || particleType === "storm" ? (Math.random() * 5 + 6) : (particleType === "snow" ? (Math.random() * 1.5 + 1) : (Math.random() * 0.3 + 0.2)),
        opacity: Math.random() * 0.4 + 0.15,
        wobble: Math.random() * Math.PI,
        wobbleSpeed: Math.random() * 0.02 + 0.01
      });
    }
  }
  
  let flashTimeout = 0;
  let lightningFlash = false;
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Lightning trigger for thunderstorms
    if (particleType === "storm") {
      if (!lightningFlash && Math.random() < 0.003) {
        lightningFlash = true;
        flashTimeout = setTimeout(() => {
          lightningFlash = false;
        }, Math.random() * 150 + 50);
      }
      if (lightningFlash) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    
    particleArray.forEach(p => {
      ctx.beginPath();
      
      if (particleType === "rain" || particleType === "storm") {
        ctx.strokeStyle = `rgba(14, 165, 233, ${p.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.speedX * 2, p.y + p.speedY * 1.5);
        ctx.stroke();
      } else if (particleType === "snow") {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        p.wobble += p.wobbleSpeed;
        const wobbleX = Math.sin(p.wobble) * 1.5;
        ctx.arc(p.x + wobbleX, p.y, p.size * 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (particleType === "cloudy") {
        ctx.fillStyle = `rgba(148, 163, 184, ${p.opacity * 0.35})`;
        ctx.arc(p.x, p.y, p.size * 15, 0, Math.PI * 2);
        ctx.fill();
      } else { // clear
        ctx.fillStyle = `rgba(251, 146, 60, ${p.opacity * 0.55})`;
        ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Motion vectors
      p.y += p.speedY;
      p.x += p.speedX;
      
      // Recycle logic
      if (p.y > canvas.height) {
        p.y = -10;
        p.x = Math.random() * canvas.width;
      }
      if (p.x < -10) {
        p.x = canvas.width + 10;
      } else if (p.x > canvas.width + 10) {
        p.x = -10;
      }
    });
    
    particleAnimFrame = requestAnimationFrame(animate);
  }
  
  window.setWeatherParticles = function(type) {
    if (particleType === type) return;
    particleType = type;
    createParticles();
  };
  
  animate();
}

// 4. Quick select location chip handles
function initQuickCities() {
  const chips = document.querySelectorAll(".city-chip");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const city = chip.getAttribute("data-city");
      if (city) {
        cityInput.value = city;
        fetchWeatherData(city);
      }
    });
  });
}

// 5. Weather Condition to Background Theme parser
function updateWeatherTheme(data) {
  const body = document.body;
  body.classList.remove("theme-clear", "theme-cloudy", "theme-rainy", "theme-snowy", "theme-stormy");
  
  const weatherId = data.weather[0].id;
  let pType = "clear";
  let themeClass = "theme-clear";
  
  if (weatherId >= 200 && weatherId < 300) {
    themeClass = "theme-stormy";
    pType = "storm";
  } else if ((weatherId >= 300 && weatherId < 400) || (weatherId >= 500 && weatherId < 600)) {
    themeClass = "theme-rainy";
    pType = "rain";
  } else if (weatherId >= 600 && weatherId < 700) {
    themeClass = "theme-snowy";
    pType = "snow";
  } else if (weatherId >= 700 && weatherId < 800) {
    themeClass = "theme-cloudy";
    pType = "cloudy";
  } else if (weatherId === 800) {
    themeClass = "theme-clear";
    pType = "clear";
  } else if (weatherId > 800) {
    themeClass = "theme-cloudy";
    pType = "cloudy";
  }
  
  body.classList.add(themeClass);
  if (window.setWeatherParticles) {
    window.setWeatherParticles(pType);
  }
  
  // Hero caption detail injection
  const subtitleEl = document.querySelector(".hero-subtitle");
  if (subtitleEl) {
    subtitleEl.innerHTML = `Currently tracking <strong>${data.name}</strong>, showing ${data.weather[0].description} patterns. Feel free to search for another city above.`;
  }
}

// 6. Visual Metric indicator handlers
function updateMetricVisuals(data) {
  // Humidity Bar Fill
  const humidityBar = document.getElementById("humidity-bar");
  if (humidityBar) {
    humidityBar.style.width = `${data.main.humidity}%`;
  }
  
  // Wind direction compass arrow
  const compassArrow = document.getElementById("compass-arrow");
  if (compassArrow) {
    const windDeg = data.wind.deg || 0;
    compassArrow.style.transform = `rotate(${windDeg}deg)`;
  }
  
  // Pressure scale pin pointer position (normal range: 950 - 1050 hPa)
  const pressurePin = document.getElementById("pressure-pin");
  if (pressurePin) {
    const press = data.main.pressure;
    const minPress = 950;
    const maxPress = 1050;
    const pct = Math.min(Math.max(((press - minPress) / (maxPress - minPress)) * 100, 0), 100);
    pressurePin.style.left = `${pct}%`;
  }
}


// ===============================
// 🗺️ MAP SETUP + TILE LAYERS
// ===============================
const TILES = {
  dark:  "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
  light: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
};
let isDarkMap = true;
const map = L.map("map").setView([12.9716, 77.5946], 13);
let tileLayer = L.tileLayer(TILES.dark, { attribution: "OpenStreetMap" }).addTo(map);

// 🌙 MAP TOGGLE
document.getElementById("map-toggle").onclick = () => {
  isDarkMap = !isDarkMap;
  map.removeLayer(tileLayer);
  tileLayer = L.tileLayer(isDarkMap ? TILES.dark : TILES.light, { attribution: "OpenStreetMap" }).addTo(map);
  document.getElementById("map-toggle").innerText = isDarkMap ? "🌙" : "☀️";
  document.body.classList.toggle("light-map", !isDarkMap);
};

// ===============================
// 🎨 BUS CONFIG
// ===============================
const BUS_CONFIG = {
  "BUS-01": { color: "#ff6600" },
  "BUS-02": { color: "#00aaff" },
  "BUS-03": { color: "#cc44ff" },
};

// ===============================
// 🌍 GLOBAL STATE
// ===============================
let follow = true, mode = "normal", selectedBus = "BUS-01";

const busState = {};
Object.keys(BUS_CONFIG).forEach(id => {
  busState[id] = {
    marker: null, realLine: null, predictedLine: null, futurePolyline: null,
    stopMarkers: [], routePolyline: null, routeWaypoints: [],
    realPath: [], predictedPath: [], buffer: [],
    isPredicting: false, isDelayed: false, slowTicks: 0,
    packetLoss: 0, recoveryCount: 0,
  };
});

const DELAY_SPEED = 15, DELAY_TICKS = 4;
let delayToastTimeout = null;

// Charts
const MAX_CHART = 40;
const speedHistory = [], confidenceHistory = [], lossHistory = [], chartLabels = [];
let tickCount = 0, speedChart, confidenceChart, lossChart;

// ===============================
// 🚍 CREATE BUS MARKERS
// ===============================
function createBusIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;background:${color};border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 3px ${color},0 0 14px ${color};"></div>`,
    iconSize: [20, 20], iconAnchor: [10, 10],
  });
}

Object.keys(BUS_CONFIG).forEach(id => {
  const color = BUS_CONFIG[id].color;
  busState[id].marker        = L.marker([12.97, 77.59], { icon: createBusIcon(color) }).addTo(map);
  busState[id].marker.bindTooltip(id, { permanent: true, direction: "top", className: "bus-label" });
  busState[id].realLine      = L.polyline([], { color, weight: 3, opacity: 0.85 }).addTo(map);
  busState[id].predictedLine = L.polyline([], { color: "#ff4444", weight: 2, dashArray: "5,5" }).addTo(map);
});

// ===============================
// ⏰ LIVE CLOCK + PEAK BADGE
// ===============================
function isPeakHour() {
  const h = new Date().getHours();
  return (h >= 8 && h < 10) || (h >= 17 && h < 19);
}
function updateClock() {
  const now = new Date();
  document.getElementById("live-clock").innerText =
    [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(n => String(n).padStart(2, "0")).join(":");
  const badge = document.getElementById("peak-badge");
  if (isPeakHour()) { badge.innerText = "🔴 Peak Hours"; badge.className = "badge-peak"; }
  else              { badge.innerText = "🟢 Off Peak";   badge.className = "badge-offpeak"; }
}
setInterval(updateClock, 1000);
updateClock();

// ===============================
// 🚏 STOP ARRIVAL PREDICTIONS
// ===============================
function renderStopPredictions(busId, stopEtas) {
  if (!stopEtas || stopEtas.length === 0) return;
  document.getElementById("stop-panel-bus").innerText = busId;
  const list = document.getElementById("stop-list");
  list.innerHTML = "";
  stopEtas.forEach(stop => {
    const row = document.createElement("div");
    row.className = "stop-row" + (stop.passed ? " stop-passed" : "");
    const icon = stop.passed ? "✅" : "🚏";
    const etaText = stop.passed ? "Passed" : `~${stop.eta_min} min`;
    const etaClass = stop.passed ? "stop-eta-passed" : stop.eta_min <= 2 ? "stop-eta-soon" : "stop-eta-normal";
    row.innerHTML = `
      <span class="stop-icon">${icon}</span>
      <span class="stop-name">${stop.name}</span>
      <span class="${etaClass}">${etaText}</span>
    `;
    list.appendChild(row);
  });
}

// ===============================
// 🚦 DELAY ALERT
// ===============================
function checkDelay(busId, speed, eta) {
  const bs = busState[busId];
  if (speed < DELAY_SPEED) {
    bs.slowTicks++;
  } else {
    if (bs.isDelayed) { bs.isDelayed = false; if (busId === selectedBus) showDelayResolved(busId); }
    bs.slowTicks = 0;
    if (busId === selectedBus) hideDelayBanner();
  }
  if (bs.slowTicks >= DELAY_TICKS && !bs.isDelayed) {
    bs.isDelayed = true;
    if (busId === selectedBus) showDelayAlert(busId, speed, eta);
  }
  if (bs.isDelayed && busId === selectedBus) {
    document.getElementById("delay-banner-text").innerText =
      `🚦 ${busId} — Heavy Traffic | Speed: ${speed} km/h | ETA: ${eta} min`;
    document.getElementById("delay-banner").style.display = "flex";
  }
}

function showDelayAlert(busId, speed, eta) {
  const toast = document.getElementById("delay-toast");
  document.getElementById("delay-toast-title").innerText = `🚦 ${busId} — Heavy Traffic`;
  document.getElementById("delay-toast-title").style.color = "#ff6600";
  toast.style.borderColor = "#ff6600"; toast.style.background = "rgba(30,10,0,0.96)";
  document.getElementById("delay-toast-speed").innerText = speed + " km/h";
  document.getElementById("delay-toast-eta").innerText   = eta + " min";
  toast.style.display = "flex";
  if (delayToastTimeout) clearTimeout(delayToastTimeout);
  delayToastTimeout = setTimeout(() => { toast.style.display = "none"; }, 6000);
}

function showDelayResolved(busId) {
  const toast = document.getElementById("delay-toast");
  document.getElementById("delay-toast-title").innerText = `✅ ${busId} — Traffic Cleared`;
  document.getElementById("delay-toast-title").style.color = "#00ffcc";
  toast.style.borderColor = "#00ffcc"; toast.style.background = "rgba(0,30,15,0.96)";
  document.getElementById("delay-toast-speed").innerText = "Resumed";
  document.getElementById("delay-toast-eta").innerText   = "Recalculating";
  toast.style.display = "flex";
  if (delayToastTimeout) clearTimeout(delayToastTimeout);
  delayToastTimeout = setTimeout(() => { toast.style.display = "none"; }, 4000);
  hideDelayBanner();
}

function hideDelayBanner() { document.getElementById("delay-banner").style.display = "none"; }
document.getElementById("delay-toast-close").onclick = () => {
  document.getElementById("delay-toast").style.display = "none";
};

// ===============================
// 🔮 FUTURE PATH
// ===============================
function renderFuturePath(busId, futurePositions) {
  const bs = busState[busId];
  const color = BUS_CONFIG[busId].color;
  if (bs.futurePolyline) { map.removeLayer(bs.futurePolyline); bs.futurePolyline = null; }
  if (futurePositions && futurePositions.length > 0) {
    bs.futurePolyline = L.polyline(futurePositions.map(p => [p.lat, p.lng]), {
      color, weight: 2, dashArray: "4,8", opacity: 0.55
    }).addTo(map);
  }
}

// ===============================
// 📍 ROUTE PROGRESS BAR
// ===============================
function updateProgressBar(busId, currentWpIdx, totalWaypoints) {
  const pct = totalWaypoints > 1 ? Math.round((currentWpIdx / (totalWaypoints - 1)) * 100) : 0;
  document.getElementById("progress-bar-fill").style.width = pct + "%";
  document.getElementById("progress-marker").style.left    = Math.min(pct, 97) + "%";
  document.getElementById("progress-pct").innerText = `${busId}: ${pct}% complete`;
  document.getElementById("stops-passed").innerText = pct >= 100 ? "✅ Arrived" : "🚌 En Route";
}

// ===============================
// 🔍 GEOCODE + OSRM ROUTING
// ===============================
async function geocode(name) {
  const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name.split(",")[0] };
}

async function getRoadRoute(start, end) {
  const res  = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`);
  const data = await res.json();
  if (!data.routes || !data.routes.length) return null;
  return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
}

function drawRoute(busId, waypoints, sName, eName) {
  const bs    = busState[busId];
  const color = BUS_CONFIG[busId].color;
  if (bs.routePolyline) map.removeLayer(bs.routePolyline);
  bs.stopMarkers.forEach(m => map.removeLayer(m));
  bs.stopMarkers = [];

  bs.routePolyline = L.polyline(waypoints, { color, weight: 3, opacity: 0.25, dashArray: "6,10" }).addTo(map);
  bs.stopMarkers.push(
    L.circleMarker(waypoints[0], { radius:7, color, fillColor:color, fillOpacity:1, weight:2 })
      .bindTooltip("🟢 " + sName).addTo(map)
  );
  bs.stopMarkers.push(
    L.circleMarker(waypoints[waypoints.length-1], { radius:7, color:"#ff4444", fillColor:"#ff4444", fillOpacity:1, weight:2 })
      .bindTooltip("🏁 " + eName).addTo(map)
  );
  map.fitBounds(bs.routePolyline.getBounds(), { padding: [50, 50] });
}

document.getElementById("btn-set-route").onclick = async () => {
  const busId = document.getElementById("route-bus-select").value;
  const sIn   = document.getElementById("input-start").value.trim();
  const eIn   = document.getElementById("input-end").value.trim();
  const stEl  = document.getElementById("route-status");

  if (!sIn || !eIn) { stEl.innerText = "⚠️ Enter both locations."; stEl.style.color = "orange"; return; }
  stEl.innerText = "🔍 Searching..."; stEl.style.color = "#aaa";

  const start = await geocode(sIn + ", Bengaluru");
  const end   = await geocode(eIn + ", Bengaluru");
  if (!start) { stEl.innerText = "❌ Not found: " + sIn; stEl.style.color = "red"; return; }
  if (!end)   { stEl.innerText = "❌ Not found: " + eIn; stEl.style.color = "red"; return; }

  stEl.innerText = "🗺️ Fetching road route...";
  const waypoints = await getRoadRoute(start, end);
  if (!waypoints) { stEl.innerText = "❌ Road route not found."; stEl.style.color = "red"; return; }

  busState[busId].routeWaypoints = waypoints;
  busState[busId].realPath       = [];
  busState[busId].predictedPath  = [];
  busState[busId].realLine.setLatLngs([]);
  busState[busId].predictedLine.setLatLngs([]);
  drawRoute(busId, waypoints, start.name, end.name);

  if (busId === selectedBus) {
    document.getElementById("label-start").innerText = "📍 " + start.name;
    document.getElementById("label-end").innerText   = "🏁 " + end.name;
  }

  if (socket && socket.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify({ bus_id: busId, route: waypoints }));

  stEl.innerText = `✅ ${busId} route set (${waypoints.length} pts)`; stEl.style.color = "#00ffcc";
};

// ===============================
// ✕ RESET ROUTE
// ===============================
document.getElementById("btn-reset-route").onclick = () => {
  const busId = document.getElementById("route-bus-select").value;
  const bs = busState[busId];

  if (bs.routePolyline) { map.removeLayer(bs.routePolyline); bs.routePolyline = null; }
  bs.stopMarkers.forEach(m => map.removeLayer(m));
  bs.stopMarkers = [];
  bs.realPath = [];
  bs.predictedPath = [];
  bs.realLine.setLatLngs([]);
  bs.predictedLine.setLatLngs([]);

  document.getElementById("input-start").value = "";
  document.getElementById("input-end").value = "";
  document.getElementById("route-status").innerText = "Route cleared";
  document.getElementById("route-status").style.color = "#aaa";
  document.getElementById("label-start").innerText = "📍 Start";
  document.getElementById("label-end").innerText = "🏁 End";
};

// ===============================
// 🗂️ BUS TABS
// ===============================
document.querySelectorAll(".bus-tab").forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll(".bus-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    selectedBus = tab.dataset.bus;
    document.getElementById("progress-pct").innerText = `Select a bus to track`;
    document.getElementById("stops-passed").innerText = "";
  };
});

// ===============================
// 🎮 CONTROLS
// ===============================
document.querySelectorAll(".mode").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".mode").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const t = btn.innerText.toLowerCase();
    mode = t.includes("very") ? "bad" : t;
    if (socket && socket.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify({ mode }));
  };
});

document.getElementById("toggle-follow").onclick = () => {
  follow = !follow;
  document.getElementById("toggle-follow").innerText = "Follow: " + (follow ? "ON" : "OFF");
};

let dashboardVisible = false;
document.getElementById("toggle-dashboard").onclick = () => {
  dashboardVisible = !dashboardVisible;
  document.getElementById("dashboard-panel").style.display = dashboardVisible ? "block" : "none";
  document.getElementById("toggle-dashboard").innerText = dashboardVisible ? "📊 Hide Charts" : "📊 Show Charts";
};

function updateConnection(status) {
  const el = document.getElementById("connection-status");
  el.innerText  = status ? "🟢 Server: Connected" : "🔴 Server: Disconnected";
  el.style.color = status ? "#00ffcc" : "red";
}

function updateSignal() {
  document.querySelectorAll(".signal span").forEach((b, i) => {
    if (mode === "normal")     b.style.opacity = "1";
    else if (mode === "slow")  b.style.opacity = i < 3 ? "1" : "0.2";
    else                       b.style.opacity = i < 1 ? "1" : "0.2";
  });
}

// ===============================
// 📈 CHARTS
// ===============================
function initCharts() {
  const def = {
    type: "line",
    options: {
      animation: false, responsive: true, maintainAspectRatio: true, aspectRatio: 3,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { ticks: { color: "#666", font: { size: 10 } }, grid: { color: "rgba(0,0,0,0.08)" } } }
    }
  };
  speedChart = new Chart(document.getElementById("speedChart"), {
    ...def, data: { labels: chartLabels, datasets: [{ data: speedHistory, borderColor: "#ff6600", backgroundColor: "rgba(255,102,0,0.08)", borderWidth: 1.5, pointRadius: 0, fill: true, tension: 0.4 }] }
  });
  confidenceChart = new Chart(document.getElementById("confidenceChart"), {
    ...def, data: { labels: chartLabels, datasets: [{ data: confidenceHistory, borderColor: "#4fc3f7", backgroundColor: "rgba(79,195,247,0.08)", borderWidth: 1.5, pointRadius: 0, fill: true, tension: 0.4 }] }
  });
  lossChart = new Chart(document.getElementById("lossChart"), {
    ...def, data: { labels: chartLabels, datasets: [{ data: lossHistory, borderColor: "#ff4444", backgroundColor: "rgba(255,68,68,0.08)", borderWidth: 1.5, pointRadius: 0, fill: true, tension: 0.4, stepped: true }] }
  });
}

function updateCharts(speed, conf, dropped) {
  tickCount++;
  if (chartLabels.length >= MAX_CHART) { chartLabels.shift(); speedHistory.shift(); confidenceHistory.shift(); lossHistory.shift(); }
  chartLabels.push(tickCount.toString());
  speedHistory.push(speed); confidenceHistory.push(conf); lossHistory.push(dropped ? 1 : 0);
  speedChart.update(); confidenceChart.update(); lossChart.update();
}

// ===============================
// 🔌 WEBSOCKET
// ===============================
const socket = new WebSocket("ws://127.0.0.1:8000/ws");
socket.onopen  = () => { updateConnection(true);  initCharts(); };
socket.onclose = () => { updateConnection(false); };

socket.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  if (!payload.buses) return;

  payload.buses.forEach(data => {
    const busId = data.bus_id;
    const bs    = busState[busId];
    const color = BUS_CONFIG[busId].color;

    // Move marker
    bs.marker.setLatLng([data.lat, data.lng]);
    if (follow && busId === selectedBus) map.setView([data.lat, data.lng], 14);

    // Paths
    if (!data.dropped) {
      bs.realPath.push([data.lat, data.lng]);
      if (bs.buffer.length > 0) { bs.buffer.forEach(p => bs.realPath.push(p)); bs.buffer = []; bs.recoveryCount++; }
      bs.predictedPath = []; bs.isPredicting = false;
      bs.marker.setIcon(createBusIcon(color));
    } else {
      bs.buffer.push([data.lat, data.lng]);
      bs.predictedPath.push([data.lat, data.lng]);
      bs.isPredicting = true; bs.packetLoss++;
      bs.marker.setIcon(createBusIcon("#ff0000"));
    }

    bs.realLine.setLatLngs(bs.realPath);
    bs.predictedLine.setLatLngs(bs.predictedPath);
    renderFuturePath(busId, data.future_positions);
    checkDelay(busId, data.speed, data.eta);

    // Only update status panel and progress for selected bus
    if (busId === selectedBus) {
      updateProgressBar(busId, data.current_wp_idx, data.total_waypoints);
      renderStopPredictions(busId, data.stop_etas);

      const conf = data.confidence;

      const ab = document.getElementById("anomaly-status");
      if (data.is_anomaly) { ab.innerText = "⚠️ Anomaly Detected!"; ab.style.color = "#ff4444"; ab.style.animation = "blink 0.8s infinite"; }
      else                 { ab.innerText = "✅ Signal Normal";      ab.style.color = "#00ffcc"; ab.style.animation = "none"; }

      const re = document.getElementById("route-score");
      re.innerText   = data.route_score + "%";
      re.style.color = data.route_score > 70 ? "#00ffcc" : data.route_score > 40 ? "orange" : "red";

      document.getElementById("speed").innerText      = "Speed: "    + data.speed       + " km/h";
      document.getElementById("eta").innerText        = "ETA: "      + data.eta         + " min";
      document.getElementById("status").innerText     = "Status: "   + (bs.isDelayed ? "⚠️ Delayed" : bs.isPredicting ? "Predicting" : "On Route");
      document.getElementById("distance").innerText   = "Distance: " + data.distance_km + " km";
      document.getElementById("tracking-status").innerText = bs.isPredicting ? "👻 Ghost Mode" : "👁 Live Tracking";
      document.getElementById("system-mode").innerText     = bs.isPredicting ? "Mode: Predictive" : "Mode: Real-Time";
      document.getElementById("confidence").innerText  = "Confidence: " + conf + "%";
      document.getElementById("buffer-status").innerText  = "Buffer: " + bs.buffer.length + " points";
      document.getElementById("replay-status").innerText  = bs.buffer.length > 0 && !bs.isPredicting ? "🔄 Replaying" : "Replay: None";
      document.getElementById("loss").innerText      = bs.packetLoss;
      document.getElementById("recovery").innerText  = bs.recoveryCount;

      updateSignal();
      updateCharts(data.speed, conf, data.dropped);

      document.querySelector(".status-panel").style.boxShadow =
        bs.isDelayed    ? "0 0 25px orange" :
        conf > 70       ? "0 0 25px #00ffcc" :
        conf > 40       ? "0 0 25px orange"  : "0 0 25px red";
    }
  });
};
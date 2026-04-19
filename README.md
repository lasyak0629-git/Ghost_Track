# 🚌 GhostTrack — Resilient Public Transport Tracking System

🚀 **Built for Track B — ThinkRoot x Vortex Hackathon 2026**

GhostTrack is a **real-time public transport tracking system** designed for **low bandwidth and high latency environments**. It tracks multiple buses, predicts ETAs using Machine Learning, and maintains a smooth user experience even during network disruptions.

---

## 👻 Ghost Mode (Core Innovation)

When GPS packets drop, GhostTrack doesn't freeze or crash.

Instead, it activates **Ghost Mode**:

* Predicts bus position using last known velocity
* Maintains smooth movement on the map
* Buffers missing GPS data
* Replays and merges data automatically once connection restores

---

## ✨ Features

* 👻 **Ghost Mode** — Predictive tracking during GPS loss
* 📦 **Store & Forward Buffer** — Data replay after recovery
* 🧠 **ML-Based ETA** — Linear Regression per bus
* 🔍 **Anomaly Detection** — Isolation Forest detects abnormal behavior
* 🚦 **Delay Detection** — Alerts when speed drops below threshold
* 🗺️ **Custom Routes** — OSRM routing + Nominatim geocoding
* 📈 **Adaptive Updates** — 1s / 2s / 3s based on network quality
* 🚏 **Stop ETA Predictions** — Live upcoming stop timings
* 📊 **Live Charts** — Speed, confidence, packet loss visualization
* 🌙 **Dark / Light Mode** — Fully adaptive UI

---

## 🛠️ Tech Stack

| Layer            | Technology                 |
| ---------------- | -------------------------- |
| Backend          | Python, FastAPI, WebSocket |
| Machine Learning | Scikit-learn, NumPy        |
| Frontend         | HTML, CSS, JavaScript      |
| Maps             | Leaflet.js                 |
| Charts           | Chart.js                   |
| Routing          | OSRM                       |
| Geocoding        | Nominatim                  |

---

## 📁 Project Structure

```
transport-tracker/
│
├── server.py
├── gps_simulator.py
├── anomaly_detector.py
├── crowd_predictor.py
├── route_scorer.py
├── ml_predictor.py
│
├── index.html
├── app.js
├── style.css
├── docs.html
│
└── requirements.txt
```

---

## 🚀 How to Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/your-username/Ghost_Track.git
cd Ghost_Track
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Start the server

```bash
uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

### 4. Open in browser

```
http://localhost:8000
```

---

## 🌐 Deployment

⚠️ GitHub Pages does **NOT** support Python backend (FastAPI).

To deploy this project:

1. Push code to GitHub
2. Use a cloud platform like Render or Railway
3. Deploy as a **Web Service**

### Example (Render)

* Build Command:

```
pip install -r requirements.txt
```

* Start Command:

```
uvicorn server:app --host 0.0.0.0 --port 10000
```

---

## 📊 Hackathon Evaluation Mapping

| Criterion              | Weight | Implementation                          |
| ---------------------- | ------ | --------------------------------------- |
| System Resilience      | 30%    | Ghost Mode, buffering, adaptive updates |
| ETA Accuracy           | 25%    | ML-based regression                     |
| Technical Architecture | 20%    | FastAPI + WebSocket + ML modules        |
| User Experience        | 10%    | Live UI, charts, alerts                 |
| Documentation          | 15%    | Complete documentation                  |

---

## 🧠 Future Improvements

* Real GPS hardware integration
* Mobile app version
* Advanced ML models (LSTM)
* Multi-city scalability

---

## 👨‍💻 Author

Developed for **ThinkRoot Hackathon 2026**

---

⭐ If you found this project interesting, consider giving it a star!

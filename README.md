🚌 GhostTrack — Resilient Public Transport Tracking System
Built for Track B — ThinkRoot x Vortex Hackathon 2026

GhostTrack is a real-time public transport tracking system designed for low bandwidth and high latency environments. It tracks 3 live buses simultaneously on real Bengaluru routes, predicts ETAs using Machine Learning, and gracefully handles network drops without degrading the user experience.

👻 What is Ghost Mode?
When GPS packets drop, GhostTrack doesn't freeze or crash. It switches to Ghost Mode — using the last known velocity to predict the bus position in real time. When connectivity returns, all buffered points are replayed and merged automatically.

✨ Features
👻 Ghost Mode — Predictive positioning when GPS drops
📦 Store & Forward Buffer — Lost packets stored and replayed on recovery
🧠 ML-Based ETA — Per-bus Linear Regression trained live on speed + distance
🔍 Anomaly Detection — Isolation Forest detects abnormal bus behaviour
🚦 Delay Detection — Toast alerts and banner when bus slows below threshold
🗺️ Custom Route Setting — Real road routes via OSRM + Nominatim geocoding
📈 Adaptive Updates — 1s normal / 2s slow / 3s bad network
🚏 Stop ETA Predictions — Real-time ETA to each upcoming bus stop
📊 Live Charts — Speed, confidence, packet loss
🌙 Dark / Light Map Toggle — Full UI adapts automatically
🛠️ Tech Stack
Layer	Technology
Backend	Python, FastAPI, WebSocket
ML	Scikit-learn (Linear Regression, Isolation Forest), NumPy
Frontend	Leaflet.js, Chart.js, HTML/CSS/JS
Routing	OSRM, Nominatim
Map Tiles	Stadia Maps (dark), OpenStreetMap (light)
🚀 How to Run
# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn server:app --host 127.0.0.1 --port 8000 --reload
Then open http://localhost:8000 in your browser.

📊 Judging Criteria
Criterion	Weight	Status
System Resilience	30%	✅ Ghost mode, buffer, adaptive updates
ETA Accuracy	25%	✅ Per-bus Linear Regression ML
Technical Architecture	20%	✅ FastAPI WebSocket, 5 ML modules
User Experience	10%	✅ Live map, charts, alerts, dark/light mode
Website Documentation	15%	✅ Full docs page included
📁 File Structure
transport-tracker/
├── server.py
├── gps_simulator.py
├── anomaly_detector.py
├── crowd_predictor.py
├── route_scorer.py
├── ml_predictor.py
├── index.html
├── app.js
├── style.css
├── docs.html
└── requirements.txt
Built Track B — Resilient Public Transport Tracking

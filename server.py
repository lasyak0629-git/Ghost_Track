from fastapi import FastAPI, WebSocket
from fastapi.responses import FileResponse
import uvicorn
import asyncio
import json
import math
from collections import deque
import numpy as np
from sklearn.linear_model import LinearRegression
import time

from gps_simulator import get_all_bus_packets, set_bus_route, bus_states
from anomaly_detector import check_anomaly
from route_scorer import update_route_score
from crowd_predictor import update_and_predict

app = FastAPI()

# ===============================
# 🧠 PER-BUS ML
# ===============================
class BusML:
    def __init__(self):
        self.speed_history = deque(maxlen=10)
        self.training_X    = []
        self.training_y    = []
        self.model         = LinearRegression()
        self.model_trained = False
        self.confidence    = 100.0
        self.last_distance = None
        self.last_time     = time.time()
        self.route_window  = deque(maxlen=20)

    def update_confidence(self, dropped):
        self.confidence = max(20, self.confidence - 5) if dropped else 100.0
        return round(self.confidence)

    def update_speed(self, speed):
        self.speed_history.append(speed)

    def record_training(self, distance_km):
        now     = time.time()
        elapsed = now - self.last_time
        if self.last_distance is not None and elapsed > 0 and self.speed_history:
            avg_spd = sum(self.speed_history) / len(self.speed_history)
            self.training_X.append([self.last_distance, self.confidence, avg_spd])
            self.training_y.append(elapsed)
            if len(self.training_X) >= 10:
                self.model.fit(np.array(self.training_X), np.array(self.training_y))
                self.model_trained = True
        self.last_distance = distance_km
        self.last_time     = now

    def predict_eta(self, distance_km, dropped):
        avg_spd = sum(self.speed_history)/len(self.speed_history) if self.speed_history else 30
        if avg_spd == 0: avg_spd = 1
        if self.model_trained:
            X = np.array([[distance_km, self.confidence, avg_spd]])
            secs = self.model.predict(X)[0]
            return max(1, round(secs * max(1, distance_km / 0.05) / 60))
        base = (distance_km / avg_spd) * 60
        if dropped:
            base *= 1 + ((100 - self.confidence) / 100) * 0.5
        return max(1, round(base))

    def update_route_score(self, dropped):
        self.route_window.append(1 if dropped else 0)
        if not self.route_window: return 100
        return max(0, round((1 - sum(self.route_window)/len(self.route_window)) * 100))

    def predict_stop_etas(self, current_wp_idx, stops, total_waypoints, speed_kmh, distance_km):
        """Predict ETA in minutes to each upcoming stop."""
        avg_spd = sum(self.speed_history)/len(self.speed_history) if self.speed_history else max(speed_kmh, 1)
        if avg_spd == 0: avg_spd = 1
        results = []
        for stop in stops:
            stop_idx = stop["idx"]
            if stop_idx <= current_wp_idx:
                results.append({"name": stop["name"], "eta_min": 0, "passed": True})
            else:
                steps_away = stop_idx - current_wp_idx
                # Each step ≈ 0.05 degrees ≈ ~5.5km/111 ≈ ~55m → at avg speed
                dist_km = steps_away * 0.055
                eta_min = max(1, round((dist_km / avg_spd) * 60))
                results.append({"name": stop["name"], "eta_min": eta_min, "passed": False})
        return results

bus_ml_map = {}

def get_ml(bus_id):
    if bus_id not in bus_ml_map:
        bus_ml_map[bus_id] = BusML()
    return bus_ml_map[bus_id]

@app.get("/")
def home(): return FileResponse("index.html")

@app.get("/style.css")
def css(): return FileResponse("style.css", media_type="text/css")

@app.get("/app.js")
def js(): return FileResponse("app.js", media_type="application/javascript")

@app.get("/docs.html")
def docs(): return FileResponse("docs.html")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("✅ Frontend connected!")
    mode = "normal"

    try:
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                msg = json.loads(raw)
                if "mode"   in msg: mode = msg["mode"]
                if "route"  in msg and "bus_id" in msg:
                    set_bus_route(msg["bus_id"], msg["route"])
            except asyncio.TimeoutError:
                pass

            packets = get_all_bus_packets(mode)
            buses_out = []

            for bus_id, packet in packets.items():
                ml         = get_ml(bus_id)
                confidence = ml.update_confidence(packet["dropped"])
                if not packet["dropped"]: ml.update_speed(packet["speed"])
                ml.record_training(packet["distance_km"])
                eta         = ml.predict_eta(packet["distance_km"], packet["dropped"])
                route_score = ml.update_route_score(packet["dropped"])
                is_anomaly  = bool(check_anomaly(packet["speed"], packet["lat"], packet["lng"]))
                future_pos  = update_and_predict(packet["lat"], packet["lng"])
                stop_etas   = ml.predict_stop_etas(
                    packet["current_wp_idx"],
                    packet["stops"],
                    packet["total_waypoints"],
                    packet["speed"],
                    packet["distance_km"]
                )

                buses_out.append({
                    "bus_id":          bus_id,
                    "lng":             packet["lng"],
                    "lat":             packet["lat"],
                    "speed":           packet["speed"],
                    "distance_km":     packet["distance_km"],
                    "dropped":         packet["dropped"],
                    "eta":             eta,
                    "confidence":      confidence,
                    "is_anomaly":      is_anomaly,
                    "route_score":     route_score,
                    "future_positions":future_pos,
                    "stop_etas":       stop_etas,
                    "current_wp_idx":  packet["current_wp_idx"],
                    "total_waypoints": packet["total_waypoints"],
                })

            await websocket.send_text(json.dumps({"buses": buses_out}))

            if mode == "slow":  await asyncio.sleep(2)
            elif mode == "bad": await asyncio.sleep(3)
            else:               await asyncio.sleep(1)

    except Exception as e:
        print(f"❌ Connection closed: {e}")

if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
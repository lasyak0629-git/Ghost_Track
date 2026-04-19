from sklearn.linear_model import LinearRegression
import numpy as np
import collections
import time

speed_history = collections.deque(maxlen=10)
training_X = []
training_y = []
model = LinearRegression()
model_trained = False
current_confidence = 100.0
last_distance = None
last_time = time.time()

def update_speed(speed_kmh):
    speed_history.append(speed_kmh)

def update_confidence(dropped):
    global current_confidence
    if dropped:
        current_confidence = max(20, current_confidence - 5)
    else:
        current_confidence = 100
    return round(current_confidence)

def record_training_point(distance_km, confidence):
    global last_distance, last_time, model_trained
    now = time.time()
    elapsed = now - last_time

    if last_distance is not None and elapsed > 0 and speed_history:
        avg_speed = sum(speed_history) / len(speed_history)
        training_X.append([last_distance, confidence, avg_speed])
        training_y.append(elapsed)
        if len(training_X) >= 10:
            model.fit(np.array(training_X), np.array(training_y))
            model_trained = True

    last_distance = distance_km
    last_time = now

def predict_eta(distance_km, confidence, dropped):
    avg_speed = sum(speed_history) / len(speed_history) if speed_history else 30
    if avg_speed == 0:
        avg_speed = 1

    if model_trained:
        X = np.array([[distance_km, confidence, avg_speed]])
        predicted_seconds = model.predict(X)[0]
        steps_remaining = max(1, distance_km / 0.05)
        total_seconds = predicted_seconds * steps_remaining
        return max(1, round(total_seconds / 60))
    else:
        base_eta = (distance_km / avg_speed) * 60
        if dropped:
            uncertainty = (100 - confidence) / 100
            base_eta = base_eta * (1 + uncertainty * 0.5)
        return max(1, round(base_eta))
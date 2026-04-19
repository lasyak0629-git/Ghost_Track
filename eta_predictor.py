import collections

speed_history = collections.deque(maxlen=10)
current_confidence = 100.0

def update_speed(speed_kmh):
    speed_history.append(speed_kmh)

def update_confidence(dropped):
    global current_confidence
    if dropped:
        current_confidence -= 5
        if current_confidence < 20:
            current_confidence = 20
    else:
        current_confidence = 100
    return round(current_confidence)

def predict_eta(distance_km, confidence, dropped):
    if speed_history:
        avg_speed = sum(speed_history) / len(speed_history)
    else:
        avg_speed = 30
    if avg_speed == 0:
        avg_speed = 1
    base_eta = (distance_km / avg_speed) * 60
    if dropped:
        uncertainty = (100 - confidence) / 100
        base_eta = base_eta * (1 + uncertainty * 0.5)
    return max(1, round(base_eta))
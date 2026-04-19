import numpy as np
from collections import deque
 
HISTORY_SIZE = 30
 
class PositionPredictor:
    def __init__(self):
        self.lat_history = deque(maxlen=HISTORY_SIZE)
        self.lng_history = deque(maxlen=HISTORY_SIZE)
 
    def add_position(self, lat, lng):
        self.lat_history.append(lat)
        self.lng_history.append(lng)
 
    def predict_next(self, steps=5):
        if len(self.lat_history) < 5:
            return []
 
        lats = np.array(self.lat_history)
        lngs = np.array(self.lng_history)
 
        weights = np.exp(np.linspace(0, 1, len(lats)))
        weights /= weights.sum()
 
        dlat = np.average(np.diff(lats), weights=weights[1:])
        dlng = np.average(np.diff(lngs), weights=weights[1:])
 
        predictions = []
        cur_lat, cur_lng = lats[-1], lngs[-1]
        for _ in range(steps):
            cur_lat += dlat
            cur_lng += dlng
            predictions.append({"lat": round(cur_lat, 6), "lng": round(cur_lng, 6)})
 
        return predictions
 
predictor = PositionPredictor()
 
def update_and_predict(lat, lng, steps=5):
    predictor.add_position(lat, lng)
    return predictor.predict_next(steps)
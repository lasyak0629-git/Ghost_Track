from sklearn.ensemble import IsolationForest
import numpy as np

class AnomalyDetector:
    def __init__(self):
        self.model = IsolationForest(contamination=0.2, random_state=42)
        self.history = []
        self.trained = False

    def add_reading(self, speed, lat, lng):
        self.history.append([speed, lat, lng])
        if len(self.history) >= 20:
            data = np.array(self.history[-50:])
            self.model.fit(data)
            self.trained = True

    def is_anomaly(self, speed, lat, lng):
        if not self.trained:
            return False
        point = np.array([[speed, lat, lng]])
        return self.model.predict(point)[0] == -1

detector = AnomalyDetector()

def check_anomaly(speed, lat, lng):
    detector.add_reading(speed, lat, lng)
    return detector.is_anomaly(speed, lat, lng)
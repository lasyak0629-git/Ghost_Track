from collections import deque

class RouteScorer:
    def __init__(self, window_size=20):
        self.window = deque(maxlen=window_size)

    def record(self, dropped):
        self.window.append(1 if dropped else 0)

    def score(self):
        if not self.window:
            return 100
        loss_rate = sum(self.window) / len(self.window)
        return max(0, round((1 - loss_rate) * 100))

scorer = RouteScorer()

def update_route_score(dropped):
    scorer.record(dropped)
    return scorer.score()
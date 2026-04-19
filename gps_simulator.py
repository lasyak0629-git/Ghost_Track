import math
import random

# ===============================
# 🚌 3 BENGALURU ROUTES WITH NAMED STOPS
# ===============================
PRESET_ROUTES = {
    "BUS-01": {
        "waypoints": [
            (12.9716, 77.5946), (12.9740, 77.5970), (12.9755, 77.5995),
            (12.9752, 77.6020), (12.9740, 77.6040), (12.9725, 77.6055),
            (12.9710, 77.6060), (12.9695, 77.6045), (12.9680, 77.6020),
            (12.9665, 77.6000), (12.9650, 77.5975), (12.9635, 77.5960),
            (12.9620, 77.5950), (12.9605, 77.5940), (12.9590, 77.5930),
        ],
        "stops": [
            {"name": "City Market",    "idx": 0},
            {"name": "KR Circle",      "idx": 2},
            {"name": "MG Road",        "idx": 4},
            {"name": "Trinity Circle", "idx": 6},
            {"name": "Richmond Rd",    "idx": 9},
            {"name": "Lalbagh Gate",   "idx": 12},
            {"name": "Jayanagar",      "idx": 14},
        ]
    },
    "BUS-02": {
        "waypoints": [
            (12.9850, 77.5700), (12.9830, 77.5730), (12.9810, 77.5760),
            (12.9790, 77.5790), (12.9770, 77.5820), (12.9750, 77.5850),
            (12.9730, 77.5880), (12.9710, 77.5910), (12.9690, 77.5940),
            (12.9670, 77.5970), (12.9650, 77.6000), (12.9630, 77.6020),
            (12.9610, 77.6040), (12.9590, 77.6060),
        ],
        "stops": [
            {"name": "Yeshwantpur",   "idx": 0},
            {"name": "Rajajinagar",   "idx": 3},
            {"name": "Vijayanagar",   "idx": 6},
            {"name": "Basavanagudi",  "idx": 9},
            {"name": "Koramangala",   "idx": 13},
        ]
    },
    "BUS-03": {
        "waypoints": [
            (12.9600, 77.6400), (12.9620, 77.6370), (12.9640, 77.6340),
            (12.9660, 77.6310), (12.9680, 77.6280), (12.9700, 77.6250),
            (12.9720, 77.6220), (12.9740, 77.6190), (12.9760, 77.6160),
            (12.9780, 77.6130), (12.9800, 77.6100), (12.9820, 77.6070),
            (12.9840, 77.6040), (12.9860, 77.6010),
        ],
        "stops": [
            {"name": "Indiranagar",   "idx": 0},
            {"name": "Domlur",        "idx": 3},
            {"name": "Marathahalli",  "idx": 6},
            {"name": "HSR Layout",    "idx": 9},
            {"name": "Banashankari",  "idx": 13},
        ]
    },
}

STEP_SIZE = 0.05

bus_states = {}

def init_buses():
    for bus_id, route_data in PRESET_ROUTES.items():
        waypoints = route_data["waypoints"]
        bus_states[bus_id] = {
            "waypoints":    list(waypoints),
            "stops":        route_data["stops"],
            "lat":          waypoints[0][0],
            "lng":          waypoints[0][1],
            "speed":        random.randint(20, 50),
            "current_idx":  1,
            "progress":     random.uniform(0, 0.3),
        }

init_buses()

def set_bus_route(bus_id, new_waypoints, stops=None):
    wps = [(wp[0], wp[1]) for wp in new_waypoints]
    total = len(wps)
    # Auto-generate evenly spaced stops if none provided
    if not stops:
        step = max(1, total // 5)
        stops = [{"name": f"Stop {i+1}", "idx": min(i*step, total-1)} for i in range(5)]
    bus_states[bus_id] = {
        "waypoints":   wps,
        "stops":       stops,
        "lat":         wps[0][0],
        "lng":         wps[0][1],
        "speed":       30,
        "current_idx": 1,
        "progress":    0.0,
    }
    print(f"🗺️ {bus_id} route set: {len(wps)} pts, {len(stops)} stops")

def should_drop_packet(mode):
    if mode == "bad":   return random.random() < 0.7
    elif mode == "slow": return random.random() < 0.3
    return False

def move_bus(bus_id):
    state = bus_states[bus_id]
    waypoints = state["waypoints"]
    idx = state["current_idx"]

    if idx >= len(waypoints):
        state["current_idx"] = 1
        state["progress"]    = 0.0
        state["lat"]         = waypoints[0][0]
        state["lng"]         = waypoints[0][1]
        idx = 1

    prev = waypoints[idx - 1]
    curr = waypoints[idx]
    state["progress"] += STEP_SIZE

    if state["progress"] >= 1.0:
        state["progress"]    = 0.0
        state["current_idx"] += 1
        state["lat"]         = curr[0]
        state["lng"]         = curr[1]
    else:
        t = state["progress"]
        state["lat"] = prev[0] + (curr[0]-prev[0])*t + random.uniform(-0.00003, 0.00003)
        state["lng"] = prev[1] + (curr[1]-prev[1])*t + random.uniform(-0.00003, 0.00003)

    state["speed"] = random.randint(15, 55)
    return state["lng"], state["lat"]

def get_distance_km(bus_id):
    state = bus_states[bus_id]
    end   = state["waypoints"][-1]
    dx    = end[1] - state["lng"]
    dy    = end[0] - state["lat"]
    return max(0.1, round(math.sqrt(dx*dx + dy*dy) * 111, 2))

def get_current_waypoint_idx(bus_id):
    return bus_states[bus_id]["current_idx"]

def get_all_bus_packets(mode="normal"):
    packets = {}
    for bus_id in bus_states:
        dropped = should_drop_packet(mode)
        state   = bus_states[bus_id]
        if not dropped:
            lng, lat = move_bus(bus_id)
        else:
            lng, lat = state["lng"], state["lat"]
        packets[bus_id] = {
            "bus_id":          bus_id,
            "lng":             lng,
            "lat":             lat,
            "speed":           state["speed"],
            "distance_km":     get_distance_km(bus_id),
            "dropped":         dropped,
            "mode":            mode,
            "current_wp_idx":  state["current_idx"],
            "stops":           state["stops"],
            "total_waypoints": len(state["waypoints"]),
        }
    return packets
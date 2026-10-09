from flask import Flask, render_template, request, jsonify
from heapq import heappush, heappop

app = Flask(__name__)
MOVES = ((0, 1), (1, 0), (0, -1), (-1, 0))

def astar(rows, cols, blocked, start, goal):
    if start in blocked or goal in blocked:
        return []
    frontier = []
    h = abs(start[0] - goal[0]) + abs(start[1] - goal[1])
    heappush(frontier, (h, 0, start))
    came_from, cost_so_far = {}, {start: 0}
    while frontier:
        _, cost, current = heappop(frontier)
        if cost != cost_so_far.get(current):
            continue
        if current == goal:
            path = [current]
            while current in came_from:
                current = came_from[current]
                path.append(current)
            return path[::-1]
        for dr, dc in MOVES:
            nxt = (current[0] + dr, current[1] + dc)
            if not (0 <= nxt[0] < rows and 0 <= nxt[1] < cols) or nxt in blocked:
                continue
            new_cost = cost + 1
            if new_cost < cost_so_far.get(nxt, float("inf")):
                cost_so_far[nxt] = new_cost
                came_from[nxt] = current
                h = abs(nxt[0] - goal[0]) + abs(nxt[1] - goal[1])
                heappush(frontier, (new_cost + h, new_cost, nxt))
    return []

@app.get("/")
def index():
    return render_template("index.html")

@app.post("/api/path")
def get_path():
    data = request.get_json(silent=True) or {}
    try:
        rows, cols = int(data["rows"]), int(data["cols"])
        start, goal = tuple(data["start"]), tuple(data["goal"])
        start = (int(start[0]), int(start[1]))
        goal = (int(goal[0]), int(goal[1]))
        blocked = {(int(p[0]), int(p[1])) for p in data.get("blocked", [])}
        if not (2 <= rows <= 20 and 2 <= cols <= 20):
            raise ValueError
        if any(not (0 <= r < rows and 0 <= c < cols) for r, c in [start, goal, *blocked]):
            raise ValueError
        path = astar(rows, cols, blocked, start, goal)
        return jsonify(path=[list(p) for p in path], found=bool(path))
    except (KeyError, TypeError, ValueError, IndexError):
        return jsonify(error="Invalid grid or path request."), 400

if __name__ == "__main__":
    app.run(debug=True)

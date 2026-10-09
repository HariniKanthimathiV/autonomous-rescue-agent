# Autonomous Rescue Agent

A grid-based rescue simulation built with Python and Flask. Create an environment, add obstacles and hazards, place rescue targets, and simulate an agent navigating to the exit.

## Features
- Editable 8×8, 10×10, 12×12, and 14×14 grid
- Obstacles, hazards, rescue targets, agent start, and exit
- A* pathfinding implemented in Python
- Run, pause, single-step, reset, and sample-map controls
- Mission statistics and activity log

## Technologies
Python 3, Flask, HTML, CSS, JavaScript, A* search.

## Run locally
1. Install Python 3.
2. In the project folder run `py -m pip install -r requirements.txt`.
3. Start the app with `py app.py`.
4. Open `http://127.0.0.1:5000` in a browser.

The Flask backend calculates paths with A* using Manhattan distance. Obstacles and hazards are blocked cells.

GitHub can host this source repository. GitHub Pages alone cannot run the Flask backend; use a Python-compatible host to publish the live application.

# Autonomous Rescue Agent

A grid-based simulation of an autonomous agent navigating an environment to locate rescue targets and reach a designated exit.

## Overview

This project simulates a rescue scenario in which an agent moves through an environment containing obstacles, hazards, and people who need to be rescued. The user can create a custom map and observe how the agent plans its route.

## Features

* Custom grid environments with adjustable sizes
* Placement of obstacles, hazards, rescue targets, start position, and exit
* A* pathfinding for route planning
* Rescue targets visited in nearest-first order
* Controls to run, pause, reset, and step through the simulation
* Mission statistics and activity log

## How it works

The environment is represented as a grid. The agent uses the A* search algorithm to find a path to its next target while avoiding blocked cells. After visiting the rescue targets, it attempts to find a path to the exit.

## Technologies Used

* HTML
* CSS
* JavaScript
* A* pathfinding algorithm

## Running the project

Open `index.html` in a modern web browser. No additional installation is required.


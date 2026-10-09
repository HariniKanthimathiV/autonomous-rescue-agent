const $ = id => document.getElementById(id);
const key = p => p.join(",");
const parse = k => k.split(",").map(Number);

let n = 10;
let start = [0, 0];
let exitCell = [9, 9];
let agent = [0, 0];
let walls = new Set();
let hazards = new Set();
let targets = new Set();
let path = [];
let pathIndex = 0;
let currentTarget = null;
let rescuedTargetPositions = new Set();
let steps = 0;
let rescued = 0;
let timer = null;
let running = false;
let ticking = false;

function log(message) {
  const item = document.createElement("li");
  item.textContent = message;
  $("log").prepend(item);
  while ($("log").children.length > 12) $("log").lastChild.remove();
}

function status(message) {
  $("statusBadge").textContent = message.toUpperCase();
}

function pause() {
  if (timer !== null) clearInterval(timer);
  timer = null;
  running = false;
  $("run").textContent = "▶ Run mission";
}

function clearRoute() {
  path = [];
  pathIndex = 0;
  currentTarget = null;
}

function render() {
  const grid = $("grid");
  grid.style.setProperty("--cols", n);
  grid.innerHTML = "";

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const position = [r, c];
      const cellKey = key(position);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cell";
      button.title = `Row ${r + 1}, column ${c + 1}`;

      if (walls.has(cellKey)) button.classList.add("wall");
      if (hazards.has(cellKey)) button.classList.add("hazard");
      if (targets.has(cellKey)) button.classList.add("target");
      if (path.slice(pathIndex).some(point => key(point) === cellKey)) button.classList.add("path");
      if (cellKey === key(start)) button.classList.add("start");
      if (cellKey === key(exitCell)) button.classList.add("exit");
      if (cellKey === key(agent)) button.classList.add("agent");

      button.textContent = cellKey === key(agent) ? "A" : cellKey === key(exitCell) ? "E" : targets.has(cellKey) ? "+" : "";
      button.addEventListener("click", () => edit(position));
      grid.appendChild(button);
    }
  }

  $("rescued").textContent = rescued;
  $("steps").textContent = steps;
  $("hazards").textContent = hazards.size;
  $("length").textContent = path.length ? path.length - 1 : "—";
  const totalTargets = rescued + targets.size;
  $("progress").style.width = (totalTargets ? 100 * rescued / totalTargets : 0) + "%";

  if (targets.size) {
    $("objective").textContent = `${rescued} rescued; ${targets.size} target(s) remaining.`;
  } else if (key(agent) === key(exitCell)) {
    $("objective").textContent = "Mission complete — all targets handled and exit reached.";
  } else {
    $("objective").textContent = "No targets remaining; route to the exit.";
  }
}

function edit(position) {
  pause();
  const cellKey = key(position);
  const tool = $("tool").value;

  if (tool === "wall" || tool === "hazard") {
    if (cellKey === key(start) || cellKey === key(exitCell) || targets.has(cellKey) || cellKey === key(agent)) return;
    const selected = tool === "wall" ? walls : hazards;
    const other = tool === "wall" ? hazards : walls;
    if (selected.has(cellKey)) selected.delete(cellKey);
    else selected.add(cellKey);
    other.delete(cellKey);
  } else if (tool === "target") {
    if (!walls.has(cellKey) && !hazards.has(cellKey) && cellKey !== key(start) && cellKey !== key(exitCell)) {
      if (targets.has(cellKey)) targets.delete(cellKey);
      else { targets.add(cellKey); rescuedTargetPositions.delete(cellKey); }
    }
  } else if (tool === "start") {
    start = position.slice();
    agent = position.slice();
    walls.delete(cellKey);
    hazards.delete(cellKey);
    targets.delete(cellKey);
  } else if (tool === "exit") {
    exitCell = position.slice();
    walls.delete(cellKey);
    hazards.delete(cellKey);
    targets.delete(cellKey);
  } else {
    walls.delete(cellKey);
    hazards.delete(cellKey);
    targets.delete(cellKey);
  }

  clearRoute();
  status("READY");
  render();
}

async function findPath(goal) {
  const response = await fetch("/api/path", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rows: n,
      cols: n,
      start: agent,
      goal,
      blocked: [...walls, ...hazards].map(parse)
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Path request failed.");
  return data.path || [];
}

async function planRoute() {
  clearRoute();
  let bestTarget = null;
  let bestPath = null;

  // Pick the closest target that has a safe, reachable path.
  for (const targetKey of targets) {
    const candidate = await findPath(parse(targetKey));
    if (candidate.length && (!bestPath || candidate.length < bestPath.length)) {
      bestTarget = targetKey;
      bestPath = candidate;
    }
  }

  if (bestTarget !== null) {
    currentTarget = bestTarget;
    path = bestPath;
    log("Route planned to nearest reachable rescue target.");
  } else if (targets.size > 0) {
    status("NO PATH");
    log("No remaining rescue target is reachable. Check for blocked cells.");
    return false;
  } else {
    path = await findPath(exitCell);
    if (!path.length) {
      status("NO PATH");
      log("No safe route to the exit. Check for blocked cells.");
      return false;
    }
    log("All targets rescued; routing to exit.");
  }

  pathIndex = 0;
  return true;
}

function handleArrival() {
  if (currentTarget !== null && key(agent) === currentTarget) {
    targets.delete(currentTarget);
    rescuedTargetPositions.add(currentTarget);
    rescued++;
    log("Rescue target reached and rescued.");
    currentTarget = null;
    path = [];
    pathIndex = 0;
    render();
    return;
  }

  if (currentTarget === null && key(agent) === key(exitCell) && targets.size === 0) {
    pause();
    status("COMPLETE");
    log("Mission complete: exit reached.");
  }
}

async function advanceOneStep() {
  if (ticking) return false;
  ticking = true;
  try {
    if (!path.length || pathIndex >= path.length - 1) {
      if (path.length && pathIndex >= path.length - 1) handleArrival();
      if (!running && timer === null && $("statusBadge").textContent === "COMPLETE") return false;
      if (!path.length && !(currentTarget === null && key(agent) === key(exitCell) && targets.size === 0)) {
        const planned = await planRoute();
        if (!planned) {
          pause();
          render();
          return false;
        }
      }
    }

    // A route can consist of the current cell when the agent is already at its goal.
    if (path.length && pathIndex >= path.length - 1) {
      handleArrival();
      render();
      return running || timer === null;
    }

    if (path.length && pathIndex < path.length - 1) {
      pathIndex++;
      agent = path[pathIndex].slice();
      steps++;
      render();
      if (pathIndex >= path.length - 1) handleArrival();
      render();
    }
    return true;
  } catch (error) {
    pause();
    status("ERROR");
    log(error.message || "Unexpected movement error.");
    return false;
  } finally {
    ticking = false;
  }
}

$("run").addEventListener("click", () => {
  if (running) {
    pause();
    status("PAUSED");
    return;
  }
  running = true;
  $("run").textContent = "Ⅱ Pause";
  status("RUNNING");
  // Do not pre-plan here; advanceOneStep owns all planning and movement.
  timer = setInterval(async () => {
    if (!running) return;
    const keepGoing = await advanceOneStep();
    if (!keepGoing && running) pause();
  }, 350);
});

$("step").addEventListener("click", async () => {
  pause();
  status("STEP");
  await advanceOneStep();
  if ($("statusBadge").textContent !== "COMPLETE" && $("statusBadge").textContent !== "NO PATH") status("READY");
});

$("reset").addEventListener("click", () => {
  pause();
  agent = start.slice();
  for (const targetKey of rescuedTargetPositions) {
    if (!walls.has(targetKey) && !hazards.has(targetKey) && targetKey !== key(start) && targetKey !== key(exitCell)) targets.add(targetKey);
  }
  rescuedTargetPositions.clear();
  clearRoute();
  steps = 0;
  rescued = 0;
  status("READY");
  log("Agent reset to start; rescued targets restored where those cells remain available.");
  render();
});

$("clear").addEventListener("click", () => {
  pause();
  walls.clear();
  hazards.clear();
  targets.clear();
  rescuedTargetPositions.clear();
  clearRoute();
  steps = 0;
  rescued = 0;
  agent = start.slice();
  status("READY");
  render();
  log("Map cleared.");
});

$("sample").addEventListener("click", () => {
  pause();
  n = Number($("size").value);
  start = [0, 0];
  agent = start.slice();
  exitCell = [n - 1, n - 1];
  walls.clear();
  hazards.clear();
  targets.clear();
  rescuedTargetPositions.clear();
  for (let r = 1; r < n - 1; r++) {
    if (r !== 3 && r !== n - 3) walls.add(key([r, Math.floor(n / 2)]));
  }
  hazards.add(key([2, 2]));
  hazards.add(key([n - 3, n - 3]));
  targets.add(key([1, n - 2]));
  targets.add(key([n - 2, 1]));
  clearRoute();
  steps = 0;
  rescued = 0;
  status("READY");
  log("Sample environment loaded.");
  render();
});

$("size").addEventListener("change", () => {
  pause();
  n = Number($("size").value);
  start = [0, 0];
  agent = start.slice();
  exitCell = [n - 1, n - 1];
  walls.clear();
  hazards.clear();
  targets.clear();
  rescuedTargetPositions.clear();
  clearRoute();
  steps = 0;
  rescued = 0;
  status("READY");
  render();
  log(`Grid resized to ${n} × ${n}.`);
});

$("sample").click();

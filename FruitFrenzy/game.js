// game.js
// Game logic for the fruit slicing game (p5.js, global mode).
//
// Public functions:
//   resetGame()                 start a fresh round
//   updateGame(dt, hitsCircle)  advance the game by dt seconds
//   drawGame()                  draw background, objects and HUD
//
// hitsCircle(x, y, radius) is provided by the hit detection code.
// It must return true if the blade touches that circle on this frame.
//
// Each section below is one build step. A step only uses code from
// earlier steps, so you can type the file in order and test as you go.
// Lines inside updateGame() are tagged with the step that adds them.


// ---------------------------------------------------------------
// STEP 1: Settings, state, reset, and a HUD
// ---------------------------------------------------------------

const GAME_SETTINGS = {
  gravity: 900,          // pixels per second squared, pulls objects down
  fruitRadius: 28,
  bombRadius: 24,
  maxMisses: 3,          // round ends after this many missed fruits
  bombChance: 0.25,      // chance that a wave also includes one bomb
  maxDt: 0.05,           // cap on dt so a lag spike cannot teleport objects

  // Difficulty ramp (see Step 6)
  startFruitsPerWave: 1,
  maxFruitsPerWave: 6,
  secondsPerExtraFruit: 15,   // one more fruit per wave every 15 s
  startWaveInterval: 2.0,     // seconds between waves at the start
  minWaveInterval: 0.9,       // fastest the waves can come
  intervalShrinkPerSecond: 0.012
};

const FRUIT_COLORS = ["#e63946", "#f4a261", "#2a9d8f", "#e9c46a", "#8ac926"];

// All mutable game state lives in one object so it does not clash
// with variable names in your teammate's files.
const gameState = {
  objects: [],      // fruits and bombs currently in flight
  score: 0,
  misses: 0,
  over: false,
  endReason: "",
  elapsed: 0,       // seconds since the round started
  waveTimer: 0,     // seconds until the next wave
  debug: false      // toggled with the D key (test_controls.js)
};

function resetGame() {
  gameState.objects = [];
  gameState.score = 0;
  gameState.misses = 0;
  gameState.over = false;
  gameState.endReason = "";
  gameState.elapsed = 0;
  gameState.waveTimer = 0.5;   // short pause before the first wave
}

// Small read-only helpers so other files never need to touch gameState.
function getScore() { return gameState.score; }
function getMisses() { return gameState.misses; }
function isGameOver() { return gameState.over; }

function drawHud() {
  noStroke();
  fill(255);
  textSize(24);
  textAlign(LEFT, TOP);
  text("Score: " + gameState.score, 16, 14);

  // One X per allowed miss, red once it has been used up
  textAlign(RIGHT, TOP);
  for (let i = 0; i < GAME_SETTINGS.maxMisses; i++) {
    fill(i < gameState.misses ? "#ff4d4d" : 90);
    text("X", width - 16 - i * 28, 14);
  }
}


// ---------------------------------------------------------------
// STEP 2: Launching objects in randomized arcs
// ---------------------------------------------------------------

// Creates a fruit or bomb just below the canvas, aimed so it rises
// into view, peaks somewhere in the upper part, then falls back down.
function launchObject(type) {
  const r = type === "bomb" ? GAME_SETTINGS.bombRadius : GAME_SETTINGS.fruitRadius;
  const g = GAME_SETTINGS.gravity;

  const startX = random(width * 0.2, width * 0.8);
  const startY = height + r;                        // fully hidden below the canvas
  const peakY = random(height * 0.12, height * 0.45);

  // Speed needed to rise from startY to peakY: v = sqrt(2 * g * distance)
  const vy = -sqrt(2 * g * (startY - peakY));

  // Pick where it should come back down, then solve for horizontal speed.
  // Time up = time down, so total flight time is about 2 * |vy| / g.
  const landX = random(width * 0.1, width * 0.9);
  const flightTime = (2 * -vy) / g;
  const vx = (landX - startX) / flightTime;

  gameState.objects.push({
    type: type,
    x: startX,
    y: startY,
    vx: vx,
    vy: vy,
    r: r,
    entered: false,   // becomes true once any part is visible (Step 3)
    color: type === "bomb" ? "#222222" : random(FRUIT_COLORS)
  });
}

function moveObject(obj, dt) {
  obj.vy += GAME_SETTINGS.gravity * dt;
  obj.x += obj.vx * dt;
  obj.y += obj.vy * dt;
}

function drawObject(obj) {
  if (obj.type === "bomb") {
    stroke(255, 60, 60);
    strokeWeight(3);
    fill(obj.color);
    ellipse(obj.x, obj.y, obj.r * 2, obj.r * 2);
    // fuse
    line(obj.x, obj.y - obj.r, obj.x + 8, obj.y - obj.r - 10);
  } else {
    noStroke();
    fill(obj.color);
    ellipse(obj.x, obj.y, obj.r * 2, obj.r * 2);
    // highlight so fruits read as round objects
    fill(255, 255, 255, 70);
    ellipse(obj.x - obj.r * 0.35, obj.y - obj.r * 0.35, obj.r * 0.6, obj.r * 0.6);
  }
}


// ---------------------------------------------------------------
// STEP 3: Tracking entry and counting misses
// ---------------------------------------------------------------

// Top edge of the circle is above the bottom of the canvas: visible.
function isOnScreen(obj) {
  return obj.y - obj.r < height;
}

// Whole circle is below the bottom edge and still moving down.
function hasFallenOut(obj) {
  return obj.vy > 0 && obj.y - obj.r > height;
}

function registerMiss() {
  gameState.misses++;
  if (gameState.misses >= GAME_SETTINGS.maxMisses) {
    endRound("Three fruits missed");
  }
}


// ---------------------------------------------------------------
// STEP 4: Slicing fruit (and STEP 5: bombs end the round)
// ---------------------------------------------------------------

function endRound(reason) {
  if (gameState.over) return;   // keep the first reason
  gameState.over = true;
  gameState.endReason = reason;
}

function drawGameOver() {
  fill(0, 0, 0, 170);
  noStroke();
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(42);
  text("Round over", width / 2, height / 2 - 40);
  textSize(22);
  text(gameState.endReason, width / 2, height / 2 + 5);
  text("Final score: " + gameState.score, width / 2, height / 2 + 40);
}


// ---------------------------------------------------------------
// STEP 6: More fruit over time
// ---------------------------------------------------------------

function fruitsPerWave() {
  const s = GAME_SETTINGS;
  const extra = floor(gameState.elapsed / s.secondsPerExtraFruit);
  return min(s.startFruitsPerWave + extra, s.maxFruitsPerWave);
}

function waveInterval() {
  const s = GAME_SETTINGS;
  return max(s.minWaveInterval, s.startWaveInterval - gameState.elapsed * s.intervalShrinkPerSecond);
}

function launchWave() {
  const count = fruitsPerWave();
  for (let i = 0; i < count; i++) {
    launchObject("fruit");
  }
  // Bombs are added on top of the fruit, so the fruit count still grows.
  if (random() < GAME_SETTINGS.bombChance) {
    launchObject("bomb");
  }
}

function drawDebug() {
  noStroke();
  fill(255, 255, 0);
  textSize(14);
  textAlign(LEFT, BOTTOM);
  const lines = [
    "time: " + gameState.elapsed.toFixed(1) + " s",
    "objects in flight: " + gameState.objects.length,
    "fruits per wave: " + fruitsPerWave(),
    "wave interval: " + waveInterval().toFixed(2) + " s",
    "next wave in: " + max(0, gameState.waveTimer).toFixed(2) + " s"
  ];
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], 12, height - 12 - (lines.length - 1 - i) * 18);
  }
  // outline every hit circle, including ones still hidden below
  noFill();
  stroke(255, 255, 0);
  strokeWeight(1);
  for (const obj of gameState.objects) {
    ellipse(obj.x, obj.y, obj.r * 2, obj.r * 2);
  }
}


// ---------------------------------------------------------------
// The two main per-frame functions
// ---------------------------------------------------------------

function updateGame(dt, hitsCircle) {
  if (gameState.over) return;                                    // [Step 5]

  dt = min(dt, GAME_SETTINGS.maxDt);                             // [Step 2]
  gameState.elapsed += dt;                                       // [Step 6]

  // Launch waves on a timer                                     // [Step 6]
  gameState.waveTimer -= dt;
  if (gameState.waveTimer <= 0) {
    launchWave();
    gameState.waveTimer = waveInterval();
  }

  // Loop backwards so removing an item does not skip the next one.
  for (let i = gameState.objects.length - 1; i >= 0; i--) {
    const obj = gameState.objects[i];
    moveObject(obj, dt);                                         // [Step 2]

    if (!obj.entered && isOnScreen(obj)) obj.entered = true;     // [Step 3]

    // Slicing: only objects the player can actually see        // [Step 4]
    if (obj.entered && isOnScreen(obj) && hitsCircle(obj.x, obj.y, obj.r)) {
      if (obj.type === "bomb") {                                 // [Step 5]
        endRound("You sliced a bomb");
        return;
      }
      gameState.score++;
      gameState.objects.splice(i, 1);   // gone, so it cannot score twice
      continue;
    }

    // Leaving the canvas                                        // [Step 3]
    if (hasFallenOut(obj)) {
      gameState.objects.splice(i, 1);
      if (obj.type === "fruit" && obj.entered) {
        registerMiss();
        if (gameState.over) return;
      }
    }
  }
}

function drawGame() {
  background(30, 22, 40);                                        // [Step 1]
  for (const obj of gameState.objects) drawObject(obj);          // [Step 2]
  if (gameState.debug) drawDebug();                              // [Step 6]
  drawHud();                                                     // [Step 1]
  if (gameState.over) drawGameOver();                            // [Step 4]
}

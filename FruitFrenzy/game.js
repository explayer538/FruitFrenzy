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
// Each section below is one build step. Lines inside updateGame() and
// drawGame() are tagged with the step that adds them.


// ---------------------------------------------------------------
// STEP 1: Settings, state, reset, and a HUD
// ---------------------------------------------------------------

const GAME_SETTINGS = {
  gravity: 900,          // pixels per second squared, pulls objects down
  fruitRadius: 28,
  bombRadius: 24,
  specialRadius: 26,
  maxMisses: 3,          // round ends after this many missed fruits
  bombChance: 0.25,      // chance that a wave also includes one bomb
  maxDt: 0.05,           // cap on dt so a lag spike cannot teleport objects

  // Difficulty ramp (see Step 6)
  startFruitsPerWave: 1,
  maxFruitsPerWave: 6,
  secondsPerExtraFruit: 15,   // one more fruit per wave every 15 s
  startWaveInterval: 2.0,     // seconds between waves at the start
  minWaveInterval: 0.9,       // fastest the waves can come
  intervalShrinkPerSecond: 0.012,

  // Special items (see Step 7)
  specialStartTime: 10,       // no special items in the first 10 s
  specialChance: 0.3,         // chance that a wave also includes one special item
  mushroomSeconds: 6,         // hallucination length
  gingerSeconds: 5,           // speed-up length
  gingerSpeed: 1.6,           // everything moves 1.6x faster
  bananaSeconds: 5,           // slow-motion length
  bananaSpeed: 0.45,          // everything moves at 45% speed
  bananaPoints: 2,            // bonus for slicing a banana
  fireRushFruits: 5,          // habanero launches this many fruit at once...
  fireRushBombs: 1,           // ...plus this many bombs

  // Kente background (see Step 8)
  kenteDarkness: 150          // 0 = full bright cloth, 255 = black
};

const FRUIT_COLORS = ["#e63946", "#f4a261", "#2a9d8f", "#e9c46a", "#8ac926"];

// All mutable game state lives in one object so it does not clash
// with variable names in your teammate's files.
const gameState = {
  objects: [],      // fruits, bombs and special items currently in flight
  score: 0,
  misses: 0,
  over: false,
  endReason: "",
  elapsed: 0,       // seconds since the round started
  waveTimer: 0,     // seconds until the next wave
  effects: { mushroom: 0, ginger: 0, banana: 0 },   // seconds left on each effect
  message: "",      // short text shown after slicing a special item
  messageTimer: 0,
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
  gameState.effects = { mushroom: 0, ginger: 0, banana: 0 };
  gameState.message = "";
  gameState.messageTimer = 0;
}

// Small read-only helpers so other files never need to touch gameState.
function getScore() { return gameState.score; }
function getMisses() { return gameState.misses; }
function isGameOver() { return gameState.over; }

function drawHud() {
  // dark bar so the text stays readable over the background
  noStroke();
  fill(0, 0, 0, 140);
  rect(0, 0, width, 50);

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

  drawEffectTimers();   // Step 7
}


// ---------------------------------------------------------------
// STEP 2: Launching objects in randomized arcs
// ---------------------------------------------------------------

function radiusFor(type) {
  if (type === "fruit") return GAME_SETTINGS.fruitRadius;
  if (type === "bomb") return GAME_SETTINGS.bombRadius;
  return GAME_SETTINGS.specialRadius;
}

// Creates an object just below the canvas, aimed so it rises into view,
// peaks somewhere in the upper part, then falls back down.
// type is "fruit", "bomb", or one of SPECIAL_TYPES (Step 7).
function launchObject(type) {
  const r = radiusFor(type);
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
    entered: false,          // becomes true once any part is visible (Step 3)
    phase: random(TWO_PI),   // gives each object its own wobble (Step 7)
    color: type === "fruit" ? random(FRUIT_COLORS) : "#222222"
  });
}

function moveObject(obj, dt) {
  obj.vy += GAME_SETTINGS.gravity * dt;
  obj.x += obj.vx * dt;
  obj.y += obj.vy * dt;
}

// Draws one object at (x, y). The hit circle is always at obj.x, obj.y;
// x and y can differ from it while the mushroom effect is active.
function drawObjectAt(obj, x, y, fruitColor) {
  if (obj.type === "bomb") {
    stroke(255, 60, 60);
    strokeWeight(3);
    fill(obj.color);
    ellipse(x, y, obj.r * 2, obj.r * 2);
    // fuse
    line(x, y - obj.r, x + 8, y - obj.r - 10);
  } else if (obj.type === "fruit") {
    stroke(0, 0, 0, 130);   // thin outline so fruit separate from the cloth
    strokeWeight(2);
    fill(fruitColor);
    ellipse(x, y, obj.r * 2, obj.r * 2);
    // highlight so fruits read as round objects
    noStroke();
    fill(255, 255, 255, 70);
    ellipse(x - obj.r * 0.35, y - obj.r * 0.35, obj.r * 0.6, obj.r * 0.6);
  } else {
    drawSpecial(obj.type, x, y, obj.r);   // Step 7
  }
}

function drawObject(obj) {
  if (gameState.effects.mushroom > 0) {
    drawHallucinatingObject(obj);   // Step 7
  } else {
    drawObjectAt(obj, obj.x, obj.y, obj.color);
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
  // Bombs and special items come on top of the fruit, so the fruit count still grows.
  if (random() < GAME_SETTINGS.bombChance) {
    launchObject("bomb");
  }
  if (gameState.elapsed >= GAME_SETTINGS.specialStartTime && random() < GAME_SETTINGS.specialChance) {
    launchObject(random(SPECIAL_TYPES));   // Step 7
  }
}

function drawDebug() {
  noStroke();
  fill(255, 255, 0);
  textSize(14);
  textAlign(LEFT, BOTTOM);
  const fx = gameState.effects;
  const lines = [
    "time: " + gameState.elapsed.toFixed(1) + " s",
    "objects in flight: " + gameState.objects.length,
    "fruits per wave: " + fruitsPerWave(),
    "wave interval: " + waveInterval().toFixed(2) + " s",
    "next wave in: " + max(0, gameState.waveTimer).toFixed(2) + " s",
    "time scale: " + timeScale().toFixed(2) +
      "  (mushroom " + fx.mushroom.toFixed(1) + ", ginger " + fx.ginger.toFixed(1) +
      ", banana " + fx.banana.toFixed(1) + ")"
  ];
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], 12, height - 12 - (lines.length - 1 - i) * 18);
  }
  // outline every hit circle (the real ones, even while hallucinating)
  noFill();
  stroke(255, 255, 0);
  strokeWeight(1);
  for (const obj of gameState.objects) {
    ellipse(obj.x, obj.y, obj.r * 2, obj.r * 2);
  }
}


// ---------------------------------------------------------------
// STEP 7: Special items
//
// None of them count as a miss when they fall. Slicing one triggers
// its effect instead of scoring a normal point.
//   mushroom  bad   hallucination: psychedelic background, the play area
//                   sways, fruit wobble and change color, fake copies appear,
//                   but the real hit circles stay where they were
//   ginger    bad   everything moves faster for a few seconds
//   habanero  bad   fire rush: a burst of extra fruit plus a bomb at once
//   banana    good  slow motion for a few seconds, plus bonus points
// ---------------------------------------------------------------

const SPECIAL_TYPES = ["mushroom", "ginger", "habanero", "banana"];

function isSpecial(type) {
  return SPECIAL_TYPES.indexOf(type) !== -1;
}

function sliceSpecial(type) {
  const s = GAME_SETTINGS;
  if (type === "mushroom") {
    gameState.effects.mushroom = s.mushroomSeconds;
    showMessage("Whoa... mushroom!");
  } else if (type === "ginger") {
    gameState.effects.ginger = s.gingerSeconds;
    showMessage("Ginger rush!");
  } else if (type === "habanero") {
    fireRush();
    showMessage("Fire rush!");
  } else if (type === "banana") {
    gameState.effects.banana = s.bananaSeconds;
    gameState.score += s.bananaPoints;
    showMessage("Banana slow-mo  +" + s.bananaPoints);
  }
}

function fireRush() {
  for (let i = 0; i < GAME_SETTINGS.fireRushFruits; i++) launchObject("fruit");
  for (let i = 0; i < GAME_SETTINGS.fireRushBombs; i++) launchObject("bomb");
}

function showMessage(msg) {
  gameState.message = msg;
  gameState.messageTimer = 1.5;
}

// How fast the game world runs right now (1 = normal).
// Ginger and banana at the same time cancel out partly.
function timeScale() {
  let scale = 1;
  if (gameState.effects.ginger > 0) scale *= GAME_SETTINGS.gingerSpeed;
  if (gameState.effects.banana > 0) scale *= GAME_SETTINGS.bananaSpeed;
  return scale;
}

// Effects count down in real seconds, so ginger does not shorten itself.
function tickEffects(realDt) {
  const fx = gameState.effects;
  fx.mushroom = max(0, fx.mushroom - realDt);
  fx.ginger = max(0, fx.ginger - realDt);
  fx.banana = max(0, fx.banana - realDt);
  gameState.messageTimer = max(0, gameState.messageTimer - realDt);
}

// 0 to 1: how strong the trip is right now. Fades in over 0.6 s and
// fades out over the last 1.2 s so it does not switch on and off abruptly.
function hallucinationStrength() {
  const left = gameState.effects.mushroom;
  if (left <= 0) return 0;
  const used = GAME_SETTINGS.mushroomSeconds - left;
  return constrain(min(used / 0.6, left / 1.2), 0, 1);
}

// A color picked by hue (0 to 360) instead of red, green, blue.
function rainbow(hue, sat, bright, alpha) {
  push();
  colorMode(HSB, 360, 100, 100, 1);
  const c = color(((hue % 360) + 360) % 360, sat, bright, alpha);
  pop();
  return c;
}

function drawHallucinatingObject(obj) {
  const t = gameState.elapsed;
  const k = hallucinationStrength();
  const wobbleX = sin(t * 4 + obj.phase) * 30 * k;
  const wobbleY = cos(t * 3 + obj.phase) * 22 * k;

  // fruit cycle through the whole rainbow, each at its own pace
  const hue = t * 200 + obj.phase * 60;

  // two see-through fake copies around the real one
  drawingContext.globalAlpha = 0.4 * k;
  drawObjectAt(obj, obj.x - wobbleX * 2, obj.y - wobbleY * 2, rainbow(hue + 120, 80, 100, 1));
  drawObjectAt(obj, obj.x + wobbleY * 2, obj.y - wobbleX * 2, rainbow(hue + 240, 80, 100, 1));
  drawingContext.globalAlpha = 1;

  // the main copy is drawn away from its real hit circle
  drawObjectAt(obj, obj.x + wobbleX, obj.y + wobbleY, rainbow(hue, 85, 100, 1));
}

// Psychedelic background: rainbow wash, spinning rays, rings pulsing outward.
function drawHallucinationBackground() {
  const t = gameState.elapsed;
  const k = hallucinationStrength();
  const baseHue = t * 90;
  const reach = sqrt(width * width + height * height);   // far enough to cover the corners

  push();
  noStroke();

  // color wash over the whole canvas
  fill(rainbow(baseHue, 75, 55, 0.9 * k));
  rect(0, 0, width, height);

  translate(width / 2, height / 2);

  // spinning rays, alternating colors
  const rays = 16;
  rotate(t * 0.7);
  for (let i = 0; i < rays; i++) {
    fill(rainbow(baseHue + (i % 2) * 150, 80, 85, 0.35 * k));
    const a = (TWO_PI / rays) * i;
    arc(0, 0, reach * 2, reach * 2, a, a + TWO_PI / rays / 2, PIE);
  }
  rotate(-t * 0.7);

  // rings that grow outward and fade
  noFill();
  strokeWeight(14);
  const rings = 9;
  const spacing = reach / rings;
  for (let i = 0; i < rings; i++) {
    const r = (t * 140 + i * spacing) % reach;
    stroke(rainbow(baseHue + i * 40, 70, 100, 0.55 * k * (1 - r / reach)));
    ellipse(0, 0, r * 2, r * 2);
  }
  pop();
}

function drawBackground() {
  // Kente cloth, darkened so the fruit stand out, with a tint per effect
  if (gameState.effects.ginger > 0) {
    drawKenteBackground(color(90, 30, 10, 165));    // warm, fast
  } else if (gameState.effects.banana > 0) {
    drawKenteBackground(color(10, 25, 70, 165));    // cool, slow
  } else {
    drawKenteBackground(color(15, 10, 20, GAME_SETTINGS.kenteDarkness));
  }
  // the trip is drawn on top, so it can fade in and out smoothly
  if (gameState.effects.mushroom > 0) drawHallucinationBackground();
}

function drawSpecial(type, x, y, r) {
  if (type === "mushroom") {
    // stem
    noStroke();
    fill(240, 225, 200);
    rect(x - r * 0.3, y, r * 0.6, r * 0.8, 4);
    // cap with white spots
    fill(220, 40, 50);
    arc(x, y + r * 0.1, r * 2, r * 1.8, PI, TWO_PI, CHORD);
    fill(255);
    ellipse(x - r * 0.45, y - r * 0.35, r * 0.35, r * 0.3);
    ellipse(x + r * 0.15, y - r * 0.55, r * 0.3, r * 0.25);
    ellipse(x + r * 0.55, y - r * 0.15, r * 0.25, r * 0.22);
  } else if (type === "ginger") {
    // knobby root made of overlapping blobs
    stroke(150, 105, 55);
    strokeWeight(2);
    fill(214, 170, 110);
    ellipse(x - r * 0.35, y + r * 0.05, r * 1.2, r * 0.9);
    ellipse(x + r * 0.4, y - r * 0.25, r * 0.9, r * 0.7);
    ellipse(x + r * 0.15, y + r * 0.45, r * 0.8, r * 0.6);
  } else if (type === "habanero") {
    // lantern-shaped pepper with a green stem
    noStroke();
    fill(255, 110, 0);
    ellipse(x, y, r * 1.6, r * 1.5);
    triangle(x - r * 0.5, y + r * 0.3, x + r * 0.5, y + r * 0.3, x + r * 0.1, y + r * 1.0);
    fill(255, 200, 120, 120);
    ellipse(x - r * 0.35, y - r * 0.2, r * 0.35, r * 0.5);
    fill(60, 150, 40);
    rect(x - r * 0.12, y - r * 1.05, r * 0.24, r * 0.4, 3);
  } else if (type === "banana") {
    // thick yellow curve with brown tips
    noFill();
    stroke(250, 215, 60);
    strokeWeight(r * 0.5);
    arc(x, y - r * 0.4, r * 1.8, r * 1.8, PI * 0.15, PI * 0.85);
    stroke(110, 80, 30);
    strokeWeight(r * 0.25);
    point(x + cos(PI * 0.15) * r * 0.9, y - r * 0.4 + sin(PI * 0.15) * r * 0.9);
    point(x + cos(PI * 0.85) * r * 0.9, y - r * 0.4 + sin(PI * 0.85) * r * 0.9);
  }
}

function drawEffectTimers() {
  const fx = gameState.effects;
  const labels = [];
  if (fx.mushroom > 0) labels.push("Hallucinating " + fx.mushroom.toFixed(1) + "s");
  if (fx.ginger > 0) labels.push("Ginger speed " + fx.ginger.toFixed(1) + "s");
  if (fx.banana > 0) labels.push("Slow motion " + fx.banana.toFixed(1) + "s");

  noStroke();
  textSize(16);
  textAlign(CENTER, TOP);
  fill(255, 230, 150);
  for (let i = 0; i < labels.length; i++) {
    text(labels[i], width / 2, 14 + i * 20);
  }

  // message after slicing a special item, fading out
  if (gameState.messageTimer > 0) {
    fill(255, 255, 255, 255 * min(1, gameState.messageTimer));
    textSize(32);
    textAlign(CENTER, CENTER);
    text(gameState.message, width / 2, height * 0.3);
  }
}


// ---------------------------------------------------------------
// STEP 8: Kente cloth background
//
// Kente is woven in narrow strips that are sewn side by side. Each strip
// is a column of blocks with its own pattern: bands, checks, bars and
// thin warp lines. The cloth is drawn once into an off-screen image
// and then copied every frame, which is much faster than redrawing it.
// The kente image in assets/ is used when it exists: see requestKenteImage().
// ---------------------------------------------------------------

const KENTE_COLORS = {
  gold: "#f2b705",
  green: "#1e7b3a",
  red: "#c8102e",
  black: "#141414",
  blue: "#1d4e89"
};

let gameKenteLayer = null;     // the drawn pattern, made once and reused

// Background image of kente cloth: assets/kente.jpg (or assets/kente.png).
// It is already made at the right size (1600 x 1200, twice the canvas, so it
// stays sharp on Retina screens), so the code just draws it. If the file is
// missing, the drawn pattern below is used instead, so the game works either way.
let gameKenteImage = null;
let gameKenteImageRequested = false;

function requestKenteImage() {
  gameKenteImageRequested = true;
  const files = ["assets/kente.jpg", "assets/kente.png"];
  // try each file in turn; loading happens in the background
  function tryNext(i) {
    if (i >= files.length) return;   // none found: keep the drawn pattern
    loadImage(files[i], (img) => { gameKenteImage = img; }, () => tryNext(i + 1));
  }
  tryNext(0);
}

function drawKenteBackground(overlay) {
  if (!gameKenteImageRequested) requestKenteImage();

  if (gameKenteImage) {
    image(gameKenteImage, 0, 0, width, height);
  } else {
    if (!gameKenteLayer || gameKenteLayer.width !== width || gameKenteLayer.height !== height) {
      gameKenteLayer = makeKenteLayer(width, height);
    }
    image(gameKenteLayer, 0, 0);
  }
  noStroke();
  fill(overlay);
  rect(0, 0, width, height);
}

function makeKenteLayer(w, h) {
  const g = createGraphics(w, h);
  g.noStroke();
  g.background(KENTE_COLORS.black);

  const stripW = 50;
  const blockH = 64;
  const strips = ceil(w / stripW);
  const blocks = ceil(h / blockH);

  for (let i = 0; i < strips; i++) {
    for (let j = 0; j < blocks; j++) {
      // alternate the designs so neighboring blocks never match
      const design = (i * 3 + j * 2 + (i % 2) * j) % 5;
      drawKenteBlock(g, i * stripW, j * blockH, stripW, blockH, design, i);
    }
    // thin black seam where two strips are sewn together
    g.fill(KENTE_COLORS.black);
    g.rect(i * stripW, 0, 2, h);
  }
  return g;
}

function drawKenteBlock(g, x, y, w, h, design, stripIndex) {
  const c = KENTE_COLORS;
  // every other strip swaps green and red so the cloth alternates
  const main = stripIndex % 2 === 0 ? c.green : c.red;
  const second = stripIndex % 2 === 0 ? c.red : c.green;

  if (design === 0) {
    // horizontal bands
    const bands = [c.gold, main, c.gold, c.black, second, c.black, c.gold, main];
    const bh = h / bands.length;
    for (let k = 0; k < bands.length; k++) {
      g.fill(bands[k]);
      g.rect(x, y + k * bh, w, bh + 0.5);
    }
  } else if (design === 1) {
    // checks of gold and black
    const size = w / 5;
    for (let row = 0; row * size < h; row++) {
      for (let col = 0; col < 5; col++) {
        g.fill((row + col) % 2 === 0 ? c.gold : c.black);
        g.rect(x + col * size, y + row * size, size, min(size, h - row * size));
      }
    }
  } else if (design === 2) {
    // solid block with a center bar and gold edges
    g.fill(main);
    g.rect(x, y, w, h);
    g.fill(c.gold);
    g.rect(x, y + 4, w, 5);
    g.rect(x, y + h - 9, w, 5);
    g.fill(c.black);
    g.rect(x + w * 0.3, y + h * 0.3, w * 0.4, h * 0.4);
    g.fill(c.blue);
    g.rect(x + w * 0.4, y + h * 0.4, w * 0.2, h * 0.2);
  } else if (design === 3) {
    // thin vertical warp lines
    const lines = [c.gold, c.black, main, c.gold, c.black, second, c.gold, c.black, main, c.gold];
    const lw = w / lines.length;
    for (let k = 0; k < lines.length; k++) {
      g.fill(lines[k]);
      g.rect(x + k * lw, y, lw + 0.5, h);
    }
  } else {
    // gold block with a stepped zigzag
    g.fill(c.gold);
    g.rect(x, y, w, h);
    g.fill(main);
    const steps = 4;
    const sw = w / steps;
    for (let k = 0; k < steps; k++) {
      const top = k % 2 === 0 ? 0.2 : 0.45;
      g.rect(x + k * sw, y + h * top, sw, h * 0.35);
    }
    g.fill(c.black);
    g.rect(x, y + h - 6, w, 6);
  }
}


// ---------------------------------------------------------------
// The two main per-frame functions
// ---------------------------------------------------------------

function updateGame(dt, hitsCircle) {
  if (gameState.over) return;                                    // [Step 5]

  const realDt = min(dt, GAME_SETTINGS.maxDt);                   // [Step 2]
  tickEffects(realDt);                                           // [Step 7]
  dt = realDt * timeScale();                                     // [Step 7]
  gameState.elapsed += realDt;                                   // [Step 6]

  // Launch waves on a timer                                     // [Step 6]
  gameState.waveTimer -= dt;
  if (gameState.waveTimer <= 0) {
    launchWave();
    gameState.waveTimer = waveInterval();
  }

  // Loop backwards so removing an item does not skip the next one.
  // Objects added during the loop (fire rush) go at the end and wait a frame.
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
      gameState.objects.splice(i, 1);   // gone, so it cannot trigger twice
      if (isSpecial(obj.type)) {                                 // [Step 7]
        sliceSpecial(obj.type);
      } else {
        gameState.score++;
      }
      continue;
    }

    // Leaving the canvas: only normal fruit counts as a miss    // [Step 3]
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
  drawBackground();                                              // [Step 1, 7, 8]
  // While hallucinating, the whole play area sways and breathes.  // [Step 7]
  // This only moves the drawing; the real hit circles stay put.
  const k = hallucinationStrength();
  push();
  if (k > 0) {
    const t = gameState.elapsed;
    translate(width / 2, height / 2);
    rotate(sin(t * 1.5) * 0.12 * k);
    scale(1 + 0.07 * sin(t * 2.3) * k);
    translate(-width / 2, -height / 2);
  }
  for (const obj of gameState.objects) drawObject(obj);          // [Step 2]
  pop();
  if (gameState.debug) drawDebug();                              // [Step 6]
  drawHud();                                                     // [Step 1]
  if (gameState.over) drawGameOver();                            // [Step 4]
}

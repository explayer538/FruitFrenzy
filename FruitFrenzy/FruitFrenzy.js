// FruitFrenzy.js (main tab, shared by both of us)
//
// This tab owns every p5 event function (setup, draw, mousePressed, ...).
// Do not define those functions in any other tab. If two tabs both define
// mousePressed, p5 silently keeps only one of them.
//
// Tabs:
//   game.js           Ramco     fruits, bombs, score, misses, difficulty
//   blade.js          Franklin  blade input, trail drawing, hitsCircle()
//   test_controls.js  Ramco     click-to-slice stand-in and debug keys

// "click": slice with single mouse clicks (works right now, for testing game.js)
// "blade": use Franklin's hitsCircle() from blade.js
const HIT_MODE = "click";

let lastMillis = 0;

function setup() {
  createCanvas(800, 600);
  resetGame();
  lastMillis = millis();
}

function draw() {
  const now = millis();
  let dt = (now - lastMillis) / 1000;   // milliseconds to seconds
  lastMillis = now;
  dt = applyTestTimeScale(dt);           // slow motion / pause (test_controls.js)

  if (HIT_MODE === "blade") {
    updateBlade(dt);
    updateGame(dt, hitsCircle);
  } else {
    updateGame(dt, clickHitsCircle);
  }
  endClickFrame();

  drawGame();                            // draws the background first
  if (HIT_MODE === "blade") {
    drawBlade();                         // blade goes on top of the game
  } else {
    drawClickCursor();
  }
  drawTestOverlay();
}

function mousePressed() {
  if (HIT_MODE === "blade") bladeMousePressed();
  else recordClick(mouseX, mouseY);
}

function mouseDragged() {
  if (HIT_MODE === "blade") bladeMouseDragged();
}

function mouseReleased() {
  if (HIT_MODE === "blade") bladeMouseReleased();
}

function keyPressed() {
  handleTestKeys(key);
}

// test_controls.js (Ramco)
//
// Testing tools so either of us can check game.js without the real blade.
// Safe to delete before the final submission, as long as FruitFrenzy.js
// stops calling these functions.
//
// Keys (work in both hit modes):
//   R  restart the round        S  slow motion (quarter speed)
//   D  debug overlay            P  pause / unpause
//   F  launch a fruit           B  launch a bomb
//   T  skip 30 seconds ahead in the difficulty ramp
//   1  launch a mushroom          2  launch a ginger
//   3  launch a habanero          4  launch a banana

const TEST_CLICK_RADIUS = 4;   // how forgiving a click is, in pixels

let testClickPending = false;
let testClickX = 0;
let testClickY = 0;
let testSlowMotion = false;
let testPaused = false;

// ---- click-to-slice stand-in for hitsCircle ----

function recordClick(x, y) {
  testClickPending = true;
  testClickX = x;
  testClickY = y;
}

// Same contract as hitsCircle in blade.js
function clickHitsCircle(x, y, radius) {
  if (!testClickPending) return false;
  return dist(testClickX, testClickY, x, y) <= radius + TEST_CLICK_RADIUS;
}

// A click only counts for the frame right after it happened
function endClickFrame() {
  testClickPending = false;
}

function drawClickCursor() {
  stroke(255);
  strokeWeight(1);
  line(mouseX - 8, mouseY, mouseX + 8, mouseY);
  line(mouseX, mouseY - 8, mouseX, mouseY + 8);
}

// ---- time controls ----

function applyTestTimeScale(dt) {
  if (testPaused) return 0;
  if (testSlowMotion) return dt * 0.25;
  return dt;
}

// ---- keys ----

function handleTestKeys(k) {
  k = k.toLowerCase();
  if (k === "r") resetGame();
  if (k === "d") gameState.debug = !gameState.debug;
  if (k === "s") testSlowMotion = !testSlowMotion;
  if (k === "p") testPaused = !testPaused;
  if (k === "f") launchObject("fruit");
  if (k === "b") launchObject("bomb");
  if (k === "t") gameState.elapsed += 30;
  if (k === "1") launchObject("mushroom");
  if (k === "2") launchObject("ginger");
  if (k === "3") launchObject("habanero");
  if (k === "4") launchObject("banana");
}

function drawTestOverlay() {
  noStroke();
  fill(0, 0, 0, 140);
  rect(0, height - 32, width, 32);
  fill(220);
  textSize(13);
  textAlign(RIGHT, BOTTOM);
  let status = "R restart  D debug  S slow  P pause  F fruit  B bomb  T +30s  1-4 specials";
  if (testSlowMotion) status = "[SLOW]  " + status;
  if (testPaused) status = "[PAUSED]  " + status;
  status = "[" + HIT_MODE + " mode]  " + status;
  text(status, width - 12, height - 12);
}

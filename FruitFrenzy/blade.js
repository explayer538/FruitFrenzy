// blade.js (Franklin)
//
// Hit detection and the blade trail. The functions below are what the
// other tabs call, so keep their names and parameters the same.
// Everything inside them is yours to write.
//
// To try your blade in the game, set HIT_MODE = "blade" at the top of
// FruitFrenzy.js. Until then the game uses click-to-slice for testing.
//
// Tip: start any global variable names in this tab with "blade"
// (bladePoints, bladeActive, ...). All tabs share one namespace, so two
// tabs declaring the same let/const name will stop the sketch from loading.


// Called once per frame by draw(), before the game updates.
// dt is the time since the last frame, in seconds.
function updateBlade(dt) {
  // TODO
}

// Called once per frame by draw(), after the game has been drawn,
// so the trail appears on top of the fruit.
function drawBlade() {
  // TODO
}

// THE CONTRACT game.js RELIES ON:
// Return true if the blade touches the circle centered at (x, y) with
// this radius during the current frame, otherwise false.
// game.js calls this for every visible fruit and bomb, every frame.
// It removes a fruit as soon as this returns true, so you do not need
// to worry about the same fruit scoring twice.
function hitsCircle(x, y, radius) {
  // TODO
  return false;
}

// Mouse events, forwarded from FruitFrenzy.js when HIT_MODE is "blade".
function bladeMousePressed() {
  // TODO
}

function bladeMouseDragged() {
  // TODO
}

function bladeMouseReleased() {
  // TODO
}

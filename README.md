# Fruit Frenzy

CS199 term project by Mouhamed and Franklin. A two-player Fruit Ninja style game written in p5.js and run with Processing's p5.js mode.

## Getting the project

Either way works:

- **Download:** on GitHub, click **Code > Download ZIP**, then unzip it anywhere.
- **Clone:** `git clone https://github.com/explayer538/FruitFrenzy.git`

The outer folder name does not matter (GitHub's zip calls it `FruitFrenzy-main`). What matters is the **inner** `FruitFrenzy` folder: do not rename it or move files out of it. Processing only runs a sketch from a folder whose name matches its main file.

## Running it

1. Open Processing and make sure the mode (top right) is **p5.js**.
2. **File > Open** and choose `FruitFrenzy/FruitFrenzy.js`.
3. Press **Run**. The game opens in your browser.

It runs right away in click mode: click a fruit to slice it.

## Layout

```
FruitFrenzy/               repo root
  README.md
  FruitFrenzy/             the Processing sketch (keep this name)
    FruitFrenzy.js         main tab: setup, draw, mouse and key events (shared)
    game.js                Mouhamed: fruits, bombs, score, misses, difficulty
    blade.js               Franklin: blade input, trail, hitsCircle()
    test_controls.js       Mouhamed: click-to-slice and debug keys for testing
    index.html             loads p5 and the tabs, managed by Processing
    sketch.properties      tells Processing this is a p5.js mode sketch
    libraries/p5.min.js    p5.js 1.5.0, included so it works offline
```

## How the parts connect

`game.js` never reads the mouse. Every frame, `draw()` calls

```js
updateGame(dt, hitsCircle);
```

and `game.js` calls `hitsCircle(x, y, radius)` for each visible fruit and bomb. It must return `true` if the blade touches that circle on the current frame. A sliced fruit is removed right away, so it cannot score twice. A sliced bomb ends the round.

`blade.js` already has the functions with the right names and empty bodies. To switch the game from clicks to the real blade, change one line at the top of `FruitFrenzy.js`:

```js
const HIT_MODE = "blade";
```

## Rules so we do not break each other's code

- Only edit your own tab. If you need a change in the other person's file, ask first.
- Do not define `setup`, `draw`, `mousePressed`, `mouseDragged`, `mouseReleased` or `keyPressed` in any tab except `FruitFrenzy.js`. If two tabs define the same one, p5 keeps only one of them. Mouse events are already forwarded to `bladeMousePressed()`, `bladeMouseDragged()` and `bladeMouseReleased()` in `blade.js`.
- All tabs share one namespace. Start global names with your tab's prefix (`game...`, `blade...`, `test...`). Two tabs declaring the same `let` or `const` name stops the whole sketch from loading.
- If you add a new tab, add it with Processing's **New Tab** button so Processing adds it to `index.html`.
- Pull before you start working, and commit only the files you changed.

## Test keys

| Key | Action |
| --- | --- |
| R | restart the round |
| D | debug overlay: hit circles, wave size, timers |
| S | slow motion |
| P | pause |
| F / B | launch a fruit / a bomb |
| T | skip 30 seconds ahead in the difficulty ramp |

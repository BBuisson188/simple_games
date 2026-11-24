import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { createRun, createStageScore, saveRunScore, scoreSnapshot } from "../games/starfighter-3d-scores.js";

const three = new URL("../games/starfighter-3d/vendor/three.module.js", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "three" ? three : specifier, context);
  }
});
const { Object3D, Vector3 } = await import(three);
const { createPatrol, getDifficulty, TRENCH_FIGHTER_POOL } = await import("../games/starfighter-3d/patrol.js");
const { EXHAUST_Z, TRENCH_START_Z } = await import("../games/starfighter-3d/trench.js");

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value)
};

test("score breakdown includes time, personal kills, turrets, damage and volleys", () => {
  const run = createRun("rookie", true);
  const stage = createStageScore(run, 1, 8);
  stage.tick(78);
  for (let i = 0; i < 5; i++) stage.kill("fighter");
  stage.kill("gun");
  stage.hit();
  stage.hit();
  for (let i = 0; i < 62; i++) stage.fire();
  const result = stage.finish(true);
  assert.equal(result.subtotal, 2523);
  assert.equal(run.score, 2523);
  assert.equal(run.finished, false);
  stage.tick(5);
  assert.equal(stage.finish(true), result);
  assert.equal(result.elapsed, 78);
});

test("crash penalties are floored; retry discards only that stage and is practice beyond Stage 1", () => {
  storage.clear();
  const run = createRun("ace", true);
  createStageScore(run, 1, 8).finish(true);
  const entering = run.score;
  const stage = createStageScore(run, 2, 15);
  stage.kill("fighter");
  stage.hit();
  assert.equal(stage.finish(false).subtotal, 0);
  assert.equal(run.score, entering);
  stage.restart();
  assert.deepEqual(run.stages, [entering]);
  assert.equal(run.score, entering);
  assert.equal(run.ranked, false);
  stage.finish(false);
  assert.equal(saveRunScore(run, "Pilot"), null);
  assert.equal(scoreSnapshot("ace").pending.length, 0);
});

test("final score saves once; campaign uses an eight-kill and 100-volley cap in the trench", () => {
  storage.clear();
  const run = createRun("standard", true);
  createStageScore(run, 1, 8).finish(true);
  createStageScore(run, 2, 15).finish(true);
  const trench = createStageScore(run, 3, 8);
  for (let i = 0; i < 10; i++) trench.kill("fighter");
  for (let i = 0; i < 150; i++) trench.fire();
  trench.tick(245);
  const result = trench.finish(true);
  assert.equal(result.fighterPoints, 800);
  assert.equal(result.volleyPenalty, 100);
  assert.equal(result.speedPoints, 0);
  assert.equal(saveRunScore(run, "Pilot").score, run.score);
  assert.equal(saveRunScore(run, "Pilot"), null);
  assert.equal(scoreSnapshot("standard").pending.length, 1);
  assert.equal(scoreSnapshot("rookie").pending.length, 0);
});

for (const [difficulty, total] of [["rookie", 8], ["standard", 9], ["ace", 10]]) {
  test(`trench ${difficulty}: distance waves reach ${total} without kills; no respawns on backtrack`, () => {
    const ship = new Object3D();
    const velocity = new Vector3();
    const patrol = createPatrol(Array.from({ length: TRENCH_FIGHTER_POOL }, () => new Object3D()),
      [], getDifficulty(difficulty), 0, false, true);
    const step = (z, seconds) => {
      ship.position.set(0, 155, z);
      for (let i = 0; i < seconds * 20; i++) patrol.update(.05, ship, ship.quaternion, velocity, () => {});
    };
    patrol.reset();
    step(TRENCH_START_Z, 4);
    assert.equal(patrol.remaining, 2);
    step(EXHAUST_Z + 1701, 4);
    assert.equal(patrol.remaining, 2);
    step(EXHAUST_Z + 1700, 4);
    assert.equal(patrol.remaining, 4);
    step(EXHAUST_Z + 1400, 4);
    assert.equal(patrol.remaining, 6);
    step(EXHAUST_Z + 1100, 4);
    assert.equal(patrol.remaining, total);
    assert.equal(patrol.defeated, 0);
    const victim = patrol.enemies.find((enemy) => enemy.model.visible);
    while (!patrol.hit(victim)) { /* apply all required hits */ }
    step(EXHAUST_Z + 1400, 4);
    step(EXHAUST_Z + 950, 4);
    assert.equal(patrol.remaining, total - 1);
  });
}

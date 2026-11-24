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
const { Object3D, Quaternion, Vector3 } = await import(three);
const { createPatrol, getDifficulty, TRENCH_FIGHTER_POOL } = await import("../games/starfighter-3d/patrol.js");
const { EXHAUST_Z, TRENCH_START_Z } = await import("../games/starfighter-3d/trench.js");
const { createManeuver, levelAttitude } = await import("../games/starfighter-3d/maneuvers.js");
const { createHoth, hothSnow } = await import("../games/starfighter-3d/hoth.js");
const { Ray, Scene } = await import(three);

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

test("retry discards the unsaved attempt, preserves the stage-entry score and stays ranked", () => {
  storage.clear();
  const run = createRun("ace", true);
  createStageScore(run, 1, 8).finish(true);
  const entering = run.score;
  const stage = createStageScore(run, 2, 15);
  stage.kill("fighter");
  stage.hit();
  assert.equal(stage.finish(false).subtotal, 0);
  assert.equal(run.score, entering);
  assert.equal(run.hasResult, true);
  stage.restart();
  assert.deepEqual(run.stages, [entering]);
  assert.equal(run.score, entering);
  assert.equal(run.ranked, true);
  assert.equal(saveRunScore(run, "Pilot"), null);
  assert.equal(scoreSnapshot("ace").pending.length, 0);
  stage.kill("fighter");
  assert.equal(stage.finish(false).subtotal, 100);
  assert.equal(saveRunScore(run, "Pilot").score, entering + 100);
  assert.equal(stage.restart(), false);
  assert.equal(saveRunScore(run, "Pilot"), null);
  assert.equal(scoreSnapshot("ace").pending.length, 1);
});

test("clears can be saved before the final stage, but continuing clears the old save option", () => {
  storage.clear();
  const run = createRun("standard", true);
  createStageScore(run, 1, 8).finish(true);
  const next = createStageScore(run, 2, 15);
  assert.equal(saveRunScore(run, "Pilot"), null);
  next.finish(true);
  assert.equal(saveRunScore(run, "Pilot").score, 5400);
});

test("direct starts remain practice after a retry, and zero-point ranked results save locally only", () => {
  storage.clear();
  const practice = createRun("rookie", false);
  const practiceStage = createStageScore(practice, 2, 15);
  practiceStage.restart();
  practiceStage.finish(true);
  assert.equal(saveRunScore(practice, "Practice"), null);
  const run = createRun("rookie", true);
  createStageScore(run, 1, 8).finish(false);
  assert.equal(saveRunScore(run, "Pilot").score, 0);
  assert.equal(scoreSnapshot("rookie").pending.length, 0);
});

test("final score saves once; campaign uses an eight-kill and 100-volley cap in the trench", () => {
  storage.clear();
  const run = createRun("standard", true);
  createStageScore(run, 1, 8).finish(true);
  createStageScore(run, 2, 15).finish(true);
  const hoth = createStageScore(run, 3, 0);
  for (let i = 0; i < 4; i++) hoth.kill("walker");
  assert.equal(hoth.finish(true).objectivePoints, 1000);
  assert.equal(run.finished, false);
  const trench = createStageScore(run, 4, 8);
  for (let i = 0; i < 10; i++) trench.kill("fighter");
  for (let i = 0; i < 150; i++) trench.fire();
  trench.tick(245);
  const result = trench.finish(true);
  assert.equal(result.fighterPoints, 800);
  assert.equal(result.volleyPenalty, 100);
  assert.equal(result.speedPoints, 0);
  assert.equal(run.finished, true);
  assert.equal(saveRunScore(run, "Pilot").score, run.score);
  assert.equal(saveRunScore(run, "Pilot"), null);
  assert.equal(scoreSnapshot("standard").pending.length, 1);
  assert.equal(scoreSnapshot("rookie").pending.length, 0);
});

test("Hoth has four different clear torpedo approaches, eight independent guns, and a final-only clear", () => {
  const battlefield = createHoth(new Scene());
  assert.equal(battlefield.guns.length, 8);
  assert.equal(new Set(battlefield.walkers.map(({ port }) => port.name)).size, 4);
  for (const [index, walker] of battlefield.walkers.entries()) {
    const { port } = walker;
    const origin = port.position.clone().addScaledVector(port.normal, 150);
    const wrongSide = port.position.clone().addScaledVector(port.normal, -100);
    const aim = port.position.clone().sub(origin).normalize();
    assert.equal(battlefield.choosePort(origin, aim), port);
    assert(battlefield.canApproach(origin, port));
    assert(!battlefield.canApproach(wrongSide, port));
    assert(battlefield.distanceToHull(new Ray(origin, aim), 150) > 150 - port.radius);
    const [left, right] = walker.guns;
    assert.equal(battlefield.hitGun(left), false);
    assert.equal(battlefield.hitGun(left), true);
    assert.equal(right.model.visible, true);
    assert.equal(battlefield.hitPort(port, () => {}), index === 3);
    assert.equal(right.model.visible, false);
    assert.equal(battlefield.remaining, 3 - index);
  }
  battlefield.update(5, new Vector3(), new Vector3(), () => {}, () => {});
  assert.equal(battlefield.phase, "defeated");
  battlefield.reset();
  assert(battlefield.guns.every((gun) => gun.model.visible));
  assert.equal(battlefield.remaining, 4);
  const belowGround = new Vector3(5, -100, 0);
  assert(battlefield.separateShip(belowGround));
  assert(belowGround.y > hothSnow(5, 0));
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

test("Jedi snap turns 110° in either direction and recharges before reuse", () => {
  for (const side of [-1, 1]) {
    const move = createManeuver("jedi");
    const attitude = new Quaternion();
    assert(move.start(attitude, side));
    move.step(.29, attitude);
    assert(Math.sign(move.bank) === side);
    assert(!move.start(attitude, side));
    move.step(.29, attitude);
    const nose = new Vector3(0, 0, -1).applyQuaternion(attitude);
    assert(Math.abs(nose.angleTo(new Vector3(0, 0, -1)) * 180 / Math.PI - 110) < .0001);
    assert.equal(Math.sign(nose.x), side);
    assert(!move.start(attitude, side));
    move.step(6, attitude);
    assert(move.start(attitude, side));
  }
});

test("Rebel half-loop climbs, reverses heading, and finishes upright", () => {
  const move = createManeuver("rebel");
  const attitude = new Quaternion();
  move.start(attitude, 1);
  move.step(.56, attitude);
  assert(new Vector3(0, 0, -1).applyQuaternion(attitude).y > .99);
  assert(new Vector3(0, 1, 0).applyQuaternion(move.camera).y > .95);
  move.step(.56, attitude);
  assert(new Vector3(0, 0, -1).applyQuaternion(attitude).z > .999);
  assert(new Vector3(0, 1, 0).applyQuaternion(attitude).y > .999);
});

test("level assist preserves the horizontal heading while removing pitch and roll", () => {
  const heading = new Vector3(6, -4, 7);
  const attitude = levelAttitude(heading, new Quaternion());
  const nose = new Vector3(0, 0, -1).applyQuaternion(attitude);
  assert(nose.angleTo(new Vector3(heading.x, 0, heading.z)) < .0001);
  assert(new Vector3(0, 1, 0).applyQuaternion(attitude).y > .999);
});

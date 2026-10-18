import assert from 'node:assert/strict';
import { cameraFlightProgress, cameraFlightDuration, clampCameraTarget } from '../lib/camera-motion';

assert.equal(cameraFlightProgress(-1, 650), 0);
assert.equal(cameraFlightProgress(0, 650), 0);
assert.equal(cameraFlightProgress(650, 650), 1);
assert.equal(cameraFlightProgress(50_000, 650), 1, 'a resumed background tab must settle without overshoot');
assert.equal(cameraFlightProgress(1, 0), 1);
const samples=Array.from({length:101},(_,i)=>cameraFlightProgress(i*6.5,650));
assert.ok(samples.every((value,index)=>value>=0&&value<=1&&(index===0||value>=samples[index-1])), 'flight progress must be monotone and bounded');
assert.ok(cameraFlightProgress(325,650)>0.9, 'strong ease-out should cover most distance in the first half');
assert.equal(cameraFlightDuration(0,1,1),300);
assert.equal(cameraFlightDuration(100_000,1,10),650);
assert.ok(cameraFlightDuration(20,1,1)<cameraFlightDuration(120,1,3));
assert.deepEqual(clampCameraTarget(0,0,2.5),[0,0]);
assert.deepEqual(clampCameraTarget(200,-200,2.5),[107.5,-70]);
assert.deepEqual(clampCameraTarget(31,14.5,2.5),[31,14.5]);
console.log('Camera checks passed: bounded easing, background-tab settling, flight duration, and scaled pan limits.');

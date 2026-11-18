import assert from 'node:assert/strict';
import { costoEstimadoGemini } from '../src/utils/aiCost.ts';

assert.equal(costoEstimadoGemini(1_000_000, 0), 0.25);
assert.equal(costoEstimadoGemini(0, 1_000_000), 1.5);
assert.equal(costoEstimadoGemini(200, 100), 0.0002);

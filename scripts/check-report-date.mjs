import assert from 'node:assert/strict';
import { rangoFechasUtc } from '../src/utils/rangoFechas.ts';

assert.deepEqual(rangoFechasUtc('2024-02-29', '2024-02-29'), { desde: '2024-02-29', hasta: '2024-03-01' });
assert.deepEqual(rangoFechasUtc('2025-12-31', '2025-12-31'), { desde: '2025-12-31', hasta: '2026-01-01' });
assert.deepEqual(rangoFechasUtc('', ''), {});
assert.equal(rangoFechasUtc('2026-11-02', '2026-11-01'), null);
assert.equal(rangoFechasUtc('', '2025-02-29'), null);
assert.equal(rangoFechasUtc('', '9999-12-31'), null);

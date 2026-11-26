import test from 'node:test';
import assert from 'node:assert/strict';
import { institutionToday, requireCurrentOrFutureDate } from '../src/utils/institutionDate.js';

test('interpreta el día civil argentino y no el UTC', () => {
  const now = new Date('2026-11-02T01:00:00.000Z'); // 1/11 22:00 Argentina
  assert.equal(institutionToday(now), '2026-11-01');
  assert.throws(() => requireCurrentOrFutureDate('2026-10-31', 'Clase', now), /anterior a hoy/);
  assert.doesNotThrow(() => requireCurrentOrFutureDate('2026-11-01', 'Clase', now));
  assert.doesNotThrow(() => requireCurrentOrFutureDate('2026-11-02', 'Clase', now));
});

test('eventos DateTime se evalúan en la zona argentina', () => {
  const now = new Date('2026-11-02T01:00:00.000Z');
  assert.doesNotThrow(() => requireCurrentOrFutureDate(new Date('2026-11-02T00:00:00.000Z'), 'Evento', now));
  assert.throws(() => requireCurrentOrFutureDate(new Date('2026-10-31T18:00:00.000Z'), 'Evento', now), /anterior a hoy/);
});

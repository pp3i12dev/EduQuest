import test from 'node:test';
import assert from 'node:assert/strict';
import { historyDeletionBlockReason, HISTORY_PROTECTED_LATEST, HISTORY_PROTECTED_DAYS } from '../src/utils/historyRetention.js';

const now = Date.parse('2026-11-03T19:00:00.000Z');
const daysAgo = d => new Date(now - d * 86400000);
const item = (date, earnedPoints = 0) => ({ id: 10, isCompleted: true, createdAt: date, earnedPoints });

test('mantiene protegidos los ultimos cinco resultados', () => {
  assert.equal(HISTORY_PROTECTED_LATEST, 5);
  assert.match(historyDeletionBlockReason(item(daysAgo(20), 0), new Set([10]), now), /últimos 5/);
});
test('mantiene protegidos los ultimos siete dias', () => {
  assert.equal(HISTORY_PROTECTED_DAYS, 7);
  assert.match(historyDeletionBlockReason(item(daysAgo(6), 0), new Set(), now), /últimos 7 días/);
});
test('permite borrar desde el septimo dia exacto si no es de los cinco recientes', () => {
  assert.equal(historyDeletionBlockReason(item(daysAgo(7), 0), new Set(), now), null);
});
test('no borra un intento sin puntos registrados', () => {
  assert.match(historyDeletionBlockReason(item(daysAgo(15), null), new Set(), now), /histórico/);
});
test('permite borrar un intento viejo con puntos registrados', () => {
  assert.equal(historyDeletionBlockReason(item(daysAgo(20), 80), new Set(), now), null);
});
test('nunca borra un intento incompleto o fecha futura', () => {
  assert.match(historyDeletionBlockReason({ ...item(daysAgo(20), 0), isCompleted: false }, new Set(), now), /finalizadas/);
  assert.match(historyDeletionBlockReason(item(new Date(now + 1), 0), new Set(), now), /últimos/);
});

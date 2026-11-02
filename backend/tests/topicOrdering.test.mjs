import test from 'node:test';
import assert from 'node:assert/strict';
import { insertTopicId, moveTopicId, numberedTopicIds } from '../src/utils/topicOrdering.js';

test('el primer tema comienza en 1', () => {
  assert.deepEqual(numberedTopicIds(insertTopicId([], 10)), [{ id: 10, position: 1 }]);
});
test('el siguiente tema se agrega al final', () => {
  assert.deepEqual(numberedTopicIds(insertTopicId([10, 20], 30)), [
    { id: 10, position: 1 }, { id: 20, position: 2 }, { id: 30, position: 3 },
  ]);
});
test('insertar un tema en posición 2 desplaza los siguientes', () => {
  assert.deepEqual(insertTopicId([10, 20, 30], 40, 2), [10, 40, 20, 30]);
});
test('mover tema del cuarto al primero renumera los demás', () => {
  assert.deepEqual(numberedTopicIds(moveTopicId([10, 20, 30, 40], 40, 1)), [
    {id:40, position:1}, {id:10, position:2}, {id:20, position:3}, {id:30, position:4},
  ]);
});
test('mover tema del primero al tercero', () => {
  assert.deepEqual(moveTopicId([10, 20, 30], 10, 3), [20, 30, 10]);
});
test('rechaza posiciones fuera del rango', () => {
  assert.throws(() => insertTopicId([10], 20, 0), {status:400});
  assert.throws(() => insertTopicId([10], 20, 3), {status:400});
  assert.throws(() => moveTopicId([10, 20], 10, 3), {status:400});
});

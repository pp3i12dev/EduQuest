import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeQuestions, gradeLabel } from '../src/utils/assessmentGrading.js';

test('verdadero/falso conserva la corrección de cada respuesta', () => {
  const result = gradeQuestions([
    { id: 1, text: 'La Tierra gira alrededor del Sol', correctAnswer: true },
    { id: 2, text: 'La Luna es una estrella', correctAnswer: false },
  ], [{ id: '1', answer: true }, { id: '2', answer: true }]);
  assert.equal(result.score, 50);
  assert.equal(result.correct, 1);
  assert.equal(result.review.length, 2);
  assert.deepEqual(result.review.map(x => x.isCorrect), [true, false]);
  assert.equal(gradeLabel(result.score), 5);
});

test('opciones múltiples conservan texto e identificador de respuesta', () => {
  const result = gradeQuestions([{ id: 1, text: '¿Cuánto es 2+2?',
    options: [{ id: 'a', text: '3' }, { id: 'b', text: '4' }], correctAnswer: 'b' }],
    [{ id: '1', optionId: 'b' }], 'multiple_choice');
  assert.equal(result.score, 100);
  assert.equal(result.review[0].correctAnswer, 'b');
  assert.equal(result.review[0].options[1].text, '4');
});

test('rechaza duplicados y opciones forjadas', () => {
  assert.throws(() => gradeQuestions([{ id: 1, correctAnswer: true }, { id: 2, correctAnswer: false }],
    [{ id: 1, answer: true }, { id: 1, answer: false }]), /repetidas/);
  assert.throws(() => gradeQuestions([{ id: 1, correctAnswer: 'b', options: [{ id: 'b', text: 'Sí' }] }],
    [{ id: 1, optionId: 'x' }], 'multiple_choice'), /inválida/);
});

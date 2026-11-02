import test from 'node:test';
import assert from 'node:assert/strict';
import { matchingQuestionBank, shuffledMatchingQuestions } from '../src/utils/matchingQuestions.js';
import { gradeQuestions } from '../src/utils/assessmentGrading.js';

process.env.JWT_SECRET = 'pruebas_locales_sin_credenciales_reales_12345';
const activity = { id: 99, content: { pairs: [
  { id: 1, left: 'Fotosíntesis', right: 'Proceso de producción de glucosa con luz' },
  { id: 2, left: 'Evaporación', right: 'Paso de líquido a gas' },
  { id: 3, left: 'Condensación', right: 'Paso de gas a líquido' },
] } };

test('no filtra respuestas al cliente ni vincula tokens con IDs de concepto', () => {
  const questions = matchingQuestionBank(activity);
  const publicQ = shuffledMatchingQuestions(questions);
  assert.equal(publicQ.length, 3);
  assert.equal(publicQ[0].options.length, 3);
  assert.equal(publicQ[0].options[0].id.startsWith('match_'), true);
  assert.equal(JSON.stringify(publicQ).includes('correctAnswer'), false);
  assert.equal(publicQ[0].options.some(opt => opt.id === '1'), false);
});

test('corrige cada par y calcula puntaje y revisión docente', () => {
  const questions = matchingQuestionBank(activity);
  const answers = questions.map(q => ({ id: q.id, optionId: q.correctAnswer }));
  const result = gradeQuestions(questions, answers, 'matching');
  assert.equal(result.score, 100);
  assert.equal(result.correct, 3);
  assert.equal(result.review.length, 3);
  assert.equal(result.review[0].options.length, 3);
  const wrong = [...answers];
  wrong[0] = { ...wrong[0], optionId: answers[1].optionId };
  wrong[1] = { ...wrong[1], optionId: answers[0].optionId };
  const part = gradeQuestions(questions, wrong, 'matching');
  assert.equal(part.correct, 1);
  assert.equal(part.score, 33);
});

test('rechaza definiciones repetidas o forjadas', () => {
  const qs = matchingQuestionBank(activity);
  const good = qs.map(q => ({ id: q.id, optionId: q.correctAnswer }));
  assert.throws(() => gradeQuestions(qs, [{...good[0]}, {...good[1], optionId: good[0].optionId}, good[2]], 'matching'), /una sola vez/);
  assert.throws(() => gradeQuestions(qs, [{...good[0], optionId: 'fake'}, good[1], good[2]], 'matching'), /inválida/);
  assert.throws(() => matchingQuestionBank({id: 99, content: {pairs: [{id: 1,left:'A',right:'igual'}, {id:2,left:'B',right:'igual'}]}}), /repetidos/);
});

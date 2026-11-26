import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeExtraGame, extraQuestionBank, toPublicExtraQuestions } from '../src/utils/gameMechanics.js';
import { gradeQuestions } from '../src/utils/assessmentGrading.js';

process.env.JWT_SECRET = 'eduquest_test_secret_abcdefghijklmnopqrstuvwxyz012345';
const sample = {
  sequence: [{ text: 'Primero' }, { text: 'Segundo' }, { text: 'Tercero' }],
  classification: [{ text: 'Manzana', category: 'Fruta' }, { text: 'Pera', category: 'Fruta' }, { text: 'Zanahoria', category: 'Verdura' }],
  fill_blank: [1,2,3].map(n => ({ text: `El ___ ${n} es correcto`, answer: `valor ${n}`, wrongAnswers: [`otra ${n}`, `otro ${n}`, `extra ${n}`] })),
  spot_error: [1,2,3].map(n => ({ text: `Detectá el error ${n}`, segments: ['2 + 2 = 4', '4 - 3 = 10', '5 + 1 = 6'], incorrectIndex: 1, explanation: 'La resta es 1.' })),
};
for (const [type, rows] of Object.entries(sample)) {
  test(`${type}: valida, oculta solución y corrige en backend`, () => {
    const content = normalizeExtraGame(type, rows);
    const activity = { id: 900 + Object.keys(sample).indexOf(type), gameType: type, content };
    const bank = extraQuestionBank(activity);
    const publicSet = toPublicExtraQuestions(bank);
    assert.equal(bank.length, rows.length);
    assert.equal(publicSet.length, rows.length);
    for (const q of publicSet) {
      assert.ok(q.options.length > 1);
      assert.ok(!Object.hasOwn(q, 'correctAnswer'));
      assert.ok(!Object.hasOwn(q, 'explanation'));
      assert.ok(!JSON.stringify(q).includes('correctAnswer'));
    }
    const good = gradeQuestions(bank, bank.map(q => ({ id: q.id, optionId: q.correctAnswer })), type);
    assert.equal(good.score, 100);
    assert.equal(good.review.filter(x => x.isCorrect).length, rows.length);
    const wrongAnswers = type === 'sequence'
      ? bank.map((q, i) => ({ id: q.id, optionId: bank[(i + 1) % bank.length].correctAnswer }))
      : bank.map(q => ({ id: q.id, optionId: q.options.find(o => o.id !== q.correctAnswer).id }));
    const wrong = gradeQuestions(bank, wrongAnswers, type);
    assert.ok(wrong.score < 100);
    assert.throws(() => gradeQuestions(bank, bank.map((q,i) => ({ id: q.id, optionId: i === 0 ? 'inventado' : q.correctAnswer })), type), /inválida|repetir una opción/);
  });
}
test('secuencia: no permite repetir tarjetas', () => {
  const bank = extraQuestionBank({ id: 999, gameType: 'sequence', content: normalizeExtraGame('sequence', sample.sequence) });
  assert.throws(() => gradeQuestions(bank, bank.map(q => ({ id: q.id, optionId: bank[0].options[0].id })), 'sequence'), /repetir una opción/);
});
test('clasificar: exige varias categorías', () => {
  assert.throws(() => normalizeExtraGame('classification', [1,2,3].map(i => ({ text: `${i}`, category: 'igual' }))), /2 a 6/);
});
test('completar: rechaza huecos múltiples y distractores repetidos', () => {
  assert.throws(() => normalizeExtraGame('fill_blank', [1,2,3].map(i => ({ text: '___ y ___', answer: 'A', wrongAnswers: ['B','C','D'] }))), /exactamente un espacio/);
});
test('encontrar error: valida índice y explicación', () => {
  assert.throws(() => normalizeExtraGame('spot_error', [1,2,3].map(i => ({ text: 'Error '+i, segments: ['A','B','C'], incorrectIndex: 7, explanation: 'La opción B es incorrecta' }))), /fragmento/);
});

test('memotest: valida parejas, oculta soluciones y califica', () => {
  const content = normalizeExtraGame('memory', [
    { left: 'Agua', right: 'H₂O' }, { left: 'Oxígeno', right: 'O₂' }, { left: 'Hidrógeno', right: 'H₂' },
  ]);
  const bank = extraQuestionBank({ id: 1501, gameType: 'memory', content });
  const publicQuestions = toPublicExtraQuestions(bank);
  assert.ok(publicQuestions.every(q => q.correctAnswer === undefined));
  assert.equal(gradeQuestions(bank, bank.map(q => ({ id: q.id, optionId: q.correctAnswer })), 'memory').score, 100);
  assert.equal(gradeQuestions(bank, bank.map((q, i) => ({ id: q.id, optionId: bank[(i + 1) % 3].correctAnswer })), 'memory').score, 0);
});

test('etiquetar imagen: marcadores, respuestas protegidas y corrección', () => {
  const content = normalizeExtraGame('image_label', [
    { text: 'Corazón', x: 35, y: 30 }, { text: 'Pulmón', x: 55, y: 30 }, { text: 'Estómago', x: 45, y: 65 },
  ], { imageUrl: '/uploads/123e4567-e89b-12d3-a456-426614174000.png' });
  const bank = extraQuestionBank({ id: 1502, gameType: 'image_label', content });
  const publicQuestions = toPublicExtraQuestions(bank);
  assert.ok(publicQuestions.every(q => q.correctAnswer === undefined && typeof q.x === 'number'));
  assert.equal(gradeQuestions(bank, bank.map(q => ({ id: q.id, optionId: q.correctAnswer })), 'image_label').score, 100);
});

test('etiquetar imagen: rechaza URL externas y coordenadas incorrectas', () => {
  const labels = [{ text: 'A', x: 20, y: 30 }, { text: 'B', x: 30, y: 40 }, { text: 'C', x: 40, y: 50 }];
  assert.throws(() => normalizeExtraGame('image_label', labels, { imageUrl: 'https://unknown.example/img.png' }), /subí/);
  assert.throws(() => normalizeExtraGame('image_label', [{ ...labels[0], x: 105 }, ...labels.slice(1)], { imageUrl: '/uploads/123e4567-e89b-12d3-a456-426614174000.png' }), /posiciones/);
});

// EduQuest: contratos reutilizables. La IA propone contenido, pero esta validación decide
// qué se puede publicar. Las soluciones NO se entregan al cliente en /play.
import { createHmac, randomInt } from 'node:crypto';

export const EXTRA_TYPES = ['sequence', 'classification', 'fill_blank', 'spot_error', 'memory'];
export const CONTENT_KEYS = {
  true_false: 'statements', multiple_choice: 'questions', matching: 'pairs',
  sequence: 'steps', classification: 'items', fill_blank: 'sentences', spot_error: 'challenges', memory: 'pairs', image_label: 'labels',
};
const fail = (message) => Object.assign(new Error(message), { status: 422 });
const clean = (value, max, field) => {
  const s = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!s || s.length > max) throw fail(`${field}: completá entre 1 y ${max} caracteres.`);
  return s;
};
const unique = (values, label) => {
  if (new Set(values.map(v => v.toLocaleLowerCase('es-AR'))).size !== values.length)
    throw fail(`${label}: no se permiten valores repetidos.`);
};
export const gameRows = (type, content) => content?.[CONTENT_KEYS[type]];
export function normalizeExtraGame(type, rows, metadata = {}) {
  if (!EXTRA_TYPES.includes(type)) throw fail('Juego desconocido.');
  if (!Array.isArray(rows) || rows.length < 3 || rows.length > 15)
    throw fail('Estos juegos requieren entre 3 y 15 desafíos.');
  if (type === 'memory') {
    const pairs = rows.map((row, i) => ({ id: i + 1,
      left: clean(row?.left, 160, `Concepto ${i + 1}`),
      right: clean(row?.right, 220, `Pareja ${i + 1}`) }));
    unique(pairs.map(p => p.left), 'Conceptos del memotest');
    unique(pairs.map(p => p.right), 'Parejas del memotest');
    return { pairs };
  }
  if (type === 'image_label') {
    const imageUrl = String(metadata?.imageUrl || '').trim();
    if (!/^\/uploads\/[a-f0-9-]{36}\.(?:png|jpe?g|webp)$/i.test(imageUrl))
      throw fail('Etiquetar imagen: primero subí una ilustración PNG, JPG o WEBP desde EduQuest.');
    const labels = rows.map((row, i) => {
      const text = clean(row?.text, 110, `Etiqueta ${i + 1}`);
      const x = Number(row?.x), y = Number(row?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 5 || x > 95 || y < 5 || y > 95)
        throw fail(`Etiqueta ${i + 1}: posiciones X/Y deben estar entre 5 y 95%.`);
      return { id: i + 1, text, x, y };
    });
    unique(labels.map(l => l.text), 'Etiquetas de la imagen');
    return { imageUrl, labels };
  }
  if (type === 'sequence') {
    const steps = rows.map((row, i) => ({ id: i + 1, text: clean(row?.text, 260, `Paso ${i + 1}`) }));
    unique(steps.map(x => x.text), 'Pasos de la secuencia');
    return { steps };
  }
  if (type === 'classification') {
    const items = rows.map((row, i) => ({ id: i + 1, text: clean(row?.text, 260, `Concepto ${i + 1}`),
      category: clean(row?.category, 100, `Categoría del concepto ${i + 1}`) }));
    unique(items.map(x => x.text), 'Conceptos');
    const categories = [...new Map(items.map(x => [x.category.toLocaleLowerCase('es-AR'), x.category])).values()];
    for (const item of items) item.category = categories.find(c => c.toLocaleLowerCase('es-AR') === item.category.toLocaleLowerCase('es-AR'));
    if (categories.length < 2 || categories.length > 6) throw fail('Clasificación: utilizá de 2 a 6 categorías distintas.');
    return { categories, items };
  }
  if (type === 'fill_blank') {
    return { sentences: rows.map((row, i) => {
      const text = clean(row?.text, 500, `Oración ${i + 1}`);
      if ((text.match(/___/g) || []).length !== 1) throw fail(`Oración ${i + 1}: marcá exactamente un espacio con tres guiones bajos (___).`);
      const answer = clean(row?.answer, 100, `Respuesta ${i + 1}`);
      const wrongAnswers = Array.isArray(row?.wrongAnswers) ? row.wrongAnswers : [];
      if (wrongAnswers.length !== 3) throw fail(`Oración ${i + 1}: indicá tres distractores.`);
      const distractors = wrongAnswers.map((v, j) => clean(v, 100, `Distractor ${j + 1}`));
      unique([answer, ...distractors], `Opciones de la oración ${i + 1}`);
      return { id: i + 1, text, answer, wrongAnswers: distractors };
    }) };
  }
  return { challenges: rows.map((row, i) => {
    const text = clean(row?.text, 320, `Consigna ${i + 1}`);
    const segments = Array.isArray(row?.segments) ? row.segments : [];
    if (segments.length < 3 || segments.length > 6) throw fail(`Desafío ${i + 1}: indicá entre 3 y 6 fragmentos.`);
    const normalized = segments.map((v, j) => clean(v, 140, `Fragmento ${j + 1}`));
    unique(normalized, `Fragmentos del desafío ${i + 1}`);
    const incorrectIndex = Number(row?.incorrectIndex);
    if (!Number.isInteger(incorrectIndex) || incorrectIndex < 0 || incorrectIndex >= normalized.length)
      throw fail(`Desafío ${i + 1}: seleccioná el fragmento que contiene el error.`);
    return { id: i + 1, text, segments: normalized, incorrectIndex,
      explanation: clean(row?.explanation, 500, `Explicación del error ${i + 1}`) };
  }) };
}
function token(activityId, type, value) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) throw Object.assign(new Error('Se requiere JWT_SECRET segura para publicar juegos.'), { status: 503 });
  return 'eq_' + createHmac('sha256', secret).update(`eduquest:game:v1:${activityId}:${type}:${value}`).digest('hex').slice(0, 26);
}
function shuffled(source) {
  const items = [...source];
  for (let i = items.length - 1; i > 0; i--) { const j = randomInt(i + 1); [items[i], items[j]] = [items[j], items[i]]; }
  return items;
}
// Salida interna exclusivamente del servidor: correctAnswer se quita al responder /play.
export function extraQuestionBank(activity) {
  const type = activity.gameType;
  const content = normalizeExtraGame(type, gameRows(type, activity.content), activity.content);
  if (type === 'memory') {
    const pairs = content.pairs;
    const options = shuffled(pairs.map((pair) => ({ id: token(activity.id, type, pair.id), text: pair.right })));
    return pairs.map(pair => ({ id: String(pair.id), text: pair.left,
      options, correctAnswer: token(activity.id, type, pair.id) }));
  }
  if (type === 'image_label') {
    const labels = content.labels;
    const options = shuffled(labels.map(item => ({ id: token(activity.id, type, item.id), text: item.text })));
    return labels.map(item => ({ id: String(item.id), text: `Punto ${item.id}`,
      x: item.x, y: item.y, options, correctAnswer: token(activity.id, type, item.id) }));
  }
  if (type === 'sequence') {
    const steps = content.steps;
    const options = shuffled(steps.map(s => ({ id: token(activity.id, type, s.id), text: s.text })));
    return steps.map((s, i) => ({ id: String(i + 1), text: `Ubicación ${i + 1} de ${steps.length}`,
      options, correctAnswer: token(activity.id, type, s.id) }));
  }
  if (type === 'classification') {
    const choices = shuffled(content.categories.map((category, i) => ({ id: token(activity.id, type, i), text: category })));
    return content.items.map(item => ({ id: String(item.id), text: item.text,
      options: choices, correctAnswer: token(activity.id, type, content.categories.findIndex(c => c === item.category)) }));
  }
  if (type === 'fill_blank') {
    return content.sentences.map(item => ({ id: String(item.id), text: item.text,
      options: shuffled([item.answer, ...item.wrongAnswers].map((word, i) => ({ id: token(activity.id, type, `${item.id}:${i}`), text: word }))),
      correctAnswer: token(activity.id, type, `${item.id}:0`) }));
  }
  return content.challenges.map(item => ({ id: String(item.id), text: item.text,
    options: shuffled(item.segments.map((segment, i) => ({ id: token(activity.id, type, `${item.id}:${i}`), text: segment }))),
    correctAnswer: token(activity.id, type, `${item.id}:${item.incorrectIndex}`), explanation: item.explanation }));
}
export function toPublicExtraQuestions(questions) {
  return questions.map(q => ({ id: q.id, text: q.text, ...(q.x == null ? {} : { x: q.x, y: q.y }), options: q.options.map(o => ({ id: o.id, text: o.text })) }));
}

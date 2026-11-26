// Corrección centralizada: el servidor decide aciertos y nota, nunca Unity.
const fail = (status, message) => Object.assign(new Error(message), { status });
export function gradeQuestions(questions, answers, type = 'true_false') {
  if (!Array.isArray(answers) || !Array.isArray(questions) || !questions.length || answers.length !== questions.length)
    throw fail(400, 'Respondé todas las preguntas exactamente una vez.');
  const answersById = new Map();
  for (const answer of answers) {
    const id = String(answer?.id ?? '');
    if (answersById.has(id)) throw fail(400, 'Hay respuestas repetidas.');
    answersById.set(id, answer);
  }
  if (!['true_false', 'multiple_choice', 'matching', 'sequence', 'classification', 'fill_blank', 'spot_error', 'memory', 'image_label'].includes(type)) throw fail(400, 'Tipo de juego inválido.');
  if (type === 'matching' || type === 'sequence' || type === 'memory' || type === 'image_label') {
    const selected = answers.map(a => String(a?.optionId ?? ''));
    if (new Set(selected).size !== selected.length)
      throw fail(400, 'No podés repetir una opción en juegos de relación u ordenamiento.');
  }
  let correct = 0;
  const review = questions.map(q => {
    const id = String(q.id);
    const a = answersById.get(id);
    if (!a) throw fail(400, 'Falta una respuesta o hay un identificador inválido.');
    if (type === 'true_false' && typeof a.answer !== 'boolean') throw fail(400, 'Respuesta verdadero/falso inválida.');
    const usesOptions = type !== 'true_false';
    const options = usesOptions ? (Array.isArray(q.options) ? q.options : []) : [];
    const answer = type === 'true_false' ? a.answer : String(a.optionId ?? '');
    if (usesOptions && !options.some(o => String(o.id) === answer))
      throw fail(400, 'Opción de respuesta inválida.');
    const expected = type === 'true_false' ? q.correctAnswer : String(q.correctAnswer);
    const isCorrect = answer === expected;
    if (isCorrect) correct += 1;
    return { id, text: String(q.text || ''), givenAnswer: answer, correctAnswer: expected,
      ...(typeof q.explanation === 'string' ? { explanation: q.explanation } : {}),
      isCorrect, options: options.map(o => ({ id: String(o.id), text: String(o.text || '') })) };
  });
  return { score: Math.round(correct * 100 / questions.length), correct,
    total: questions.length, review };
}
export function gradeLabel(score) { return Number((score / 10).toFixed(1)); }

import { createHmac, randomInt } from 'node:crypto';

const invalid = (message) => Object.assign(new Error(message), { status: 409 });

// El token de cada definición NO es el ID del concepto. Nunca enviar el vínculo correcto a Unity.
function answerToken(activityId, pairId) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) throw invalid('JWT_SECRET no está configurada correctamente.');
  return 'match_' + createHmac('sha256', secret)
    .update(`eduquest:matching:v1:${activityId}:${pairId}`)
    .digest('hex').slice(0, 24);
}

export function matchingQuestionBank(activity) {
  const pairs = activity?.content?.pairs;
  if (!Array.isArray(pairs) || pairs.length < 2 || pairs.length > 20)
    throw invalid('El juego debe tener entre 2 y 20 pares de conceptos.');
  if (new Set(pairs.map(p => String(p.id))).size !== pairs.length ||
      new Set(pairs.map(p => String(p.right || '').trim().toLocaleLowerCase('es'))).size !== pairs.length ||
      pairs.some(p => !String(p.left || '').trim() || !String(p.right || '').trim()))
    throw invalid('El juego contiene conceptos, identificadores o definiciones repetidos o incompletos.');

  const options = pairs.map(pair => ({ id: answerToken(activity.id, pair.id), text: pair.right.trim() }));
  return pairs.map(pair => ({
    id: String(pair.id),
    text: String(pair.left).trim(),
    options,
    correctAnswer: answerToken(activity.id, pair.id),
  }));
}

// Fisher-Yates. Solo cambia la PRESENTACIÓN, no las soluciones.
export function shuffledMatchingQuestions(questions) {
  const result = questions.map(q => ({ ...q, options: [...q.options] }));
  const common = [...(result[0]?.options || [])];
  for (let i = common.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [common[i], common[j]] = [common[j], common[i]];
  }
  return result.map(q => ({ id: q.id, text: q.text, options: common }));
}

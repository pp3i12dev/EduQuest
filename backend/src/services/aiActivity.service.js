import { findTeacherProfileByUserId } from '../repositories/teacherSubject.repository.js';
import { getOwnedTeacherSubject, readOwnedPdf, createReviewedDraft, getOwnedDraft, updateOwnedStatus, updateReviewedDraft } from '../repositories/aiActivity.repository.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
const TYPES = ['true_false', 'multiple_choice', 'matching'];
const LIMIT = { max: 5, window: 10 * 60 * 1000 };
const recentRequests = new Map();

const cleanString = (value, max, label) => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > max) throw fail(400, `${label} es obligatorio y no puede superar ${max} caracteres.`);
  return text;
};

async function teacherAssignment(user, teacherSubjectId) {
  const id = Number(teacherSubjectId);
  if (!Number.isSafeInteger(id) || id <= 0) throw fail(400, 'Materia inválida.');
  const [profile, assignment] = await Promise.all([
    findTeacherProfileByUserId(user.id), getOwnedTeacherSubject(user.id, id),
  ]);
  if (!profile || !assignment || assignment.teacherId !== profile.id) throw fail(403, 'Solo el docente titular de una materia vigente puede generar y publicar preguntas.');
  return { assignment, teacherId: profile.id };
}

function normalizeQuestion(row, type, i) {
  const id = i + 1;
  if (type === 'true_false') {
    return { id, text: cleanString(row?.text, 600, `Afirmación ${id}`), correctAnswer: booleanAnswer(row?.correctAnswer) };
  }
  if (type === 'multiple_choice') {
    const options = Array.isArray(row?.options) ? row.options : [];
    if (options.length !== 4) throw fail(422, `La pregunta ${id} debe tener exactamente 4 opciones.`);
    const clean = options.map((o, index) => ({ id: String(index + 1), text: cleanString(typeof o === 'string' ? o : o?.text, 200, `Opción ${index + 1}`) }));
    if (new Set(clean.map(o => o.text.toLocaleLowerCase('es'))).size !== clean.length) throw fail(422, `La pregunta ${id} contiene opciones repetidas.`);
    const answer = String(row?.correctAnswer ?? '');
    if (!['1','2','3','4'].includes(answer)) throw fail(422, `Respuesta inválida en pregunta ${id}.`);
    return { id, text: cleanString(row?.text, 600, `Pregunta ${id}`), options: clean, correctAnswer: answer, explanation: (row?.explanation || '').slice(0, 500) };
  }
  const left = cleanString(row?.left, 200, `Concepto ${id}`);
  const right = cleanString(row?.right, 260, `Definición ${id}`);
  return { id, left, right };
}
function booleanAnswer(value) {
  if (typeof value !== 'boolean') throw fail(422, 'La respuesta correcta de una afirmación debe ser true o false.');
  return value;
}
export function normalizeGenerated(type, rows) {
  if (!TYPES.includes(type)) throw fail(400, 'Formato de juego no permitido.');
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 20) throw fail(422, 'Debe haber entre 1 y 20 preguntas.');
  const normalized = rows.map((row, i) => normalizeQuestion(row, type, i));
  if (type === 'true_false') return { statements: normalized };
  if (type === 'multiple_choice') return { questions: normalized };
  if (new Set(normalized.map(x => x.left.toLowerCase())).size !== normalized.length) throw fail(422, 'Los conceptos para unir deben ser distintos.');
  return { pairs: normalized };
}

function checkLimit(userId) {
  const now = Date.now();
  const previous = (recentRequests.get(userId) || []).filter(time => now - time < LIMIT.window);
  if (previous.length >= LIMIT.max) throw fail(429, 'Límite de 5 generaciones cada 10 minutos. Probá más tarde.');
  previous.push(now);
  recentRequests.set(userId, previous);
}

// Los fallos temporales del proveedor no son errores del docente.
// Reintentamos con pausas progresivas, pero nunca de manera ilimitada.
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const retryableGeminiStatus = (status) => status === 408 || status === 429 || (status >= 500 && status <= 599);

async function callGemini({ prompt, type, count, pdf }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw fail(503, 'Falta configurar GEMINI_API_KEY en el backend; no se generaron preguntas.');
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw fail(500, 'Modelo Gemini inválido.');
  const parts = [{ text: `Actuá como asistente docente. Produci exactamente ${count} elementos educativos en español argentino, precisos y adecuados a la edad del curso.
Fuente de instrucciones: ${prompt}.
Tipo: ${type}.
Si hay PDF, usá exclusivamente hechos apoyados en el PDF y en el tema acotado. Evitá inventar información o respuestas. No incluyas nombres de alumnos.
Devolvé SOLO un objeto JSON de forma {"questions": [...]} con los campos: ${type === 'true_false' ? '{"text":"...","correctAnswer":true}' : type === 'multiple_choice' ? '{"text":"...","options":[{"text":"..."},{"text":"..."},{"text":"..."},{"text":"..."}],"correctAnswer":"1","explanation":"..."} (correctAnswer índice 1..4)' : '{"left":"concepto","right":"definición"}'}.
Antes de responder comprobá internamente las soluciones. No incluyas markdown.` }];
  if (pdf) parts.push({ inlineData: { mimeType: 'application/pdf', data: pdf.buffer.toString('base64') } });

  const body = JSON.stringify({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 6000,
    },
  });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 60000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: ac.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body,
      });

      if (!response.ok) {
        const raw = await response.text();
        const temporary = retryableGeminiStatus(response.status);
        console.warn(`[EduQuest AI] Gemini ${response.status}. Intento ${attempt}/${maxAttempts}.`);
        if (temporary && attempt < maxAttempts) {
          const delay = Math.min(8000, 1200 * (2 ** (attempt - 1))) + Math.floor(Math.random() * 650);
          await sleep(delay);
          continue;
        }
        if (response.status === 503) {
          throw fail(503, 'Gemini está temporalmente saturado. No se generaron preguntas; volvé a intentarlo en unos minutos.');
        }
        if (response.status === 429) {
          throw fail(429, 'Gemini alcanzó su límite de uso para este proyecto. Reintentá más tarde o revisá las cuotas.');
        }
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          console.error('[EduQuest AI] Revisar credenciales/configuración del proveedor:', raw.slice(0, 500));
          throw fail(502, 'La configuración del proveedor de IA requiere revisión. Avisá al administrador.');
        }
        throw fail(502, 'No se pudieron generar preguntas desde Gemini. Intentá nuevamente.');
      }

      const data = await response.json();
      const answer = (data?.candidates?.[0]?.content?.parts || [])
        .filter(part => typeof part.text === 'string')
        .map(part => part.text).join('');
      if (!answer) throw fail(502, 'El proveedor no devolvió contenido válido.');
      let parsed;
      try { parsed = JSON.parse(answer); }
      catch { throw fail(502, 'La IA devolvió un JSON no válido. Volvé a generar.'); }
      return parsed.questions;
    } catch (error) {
      if (error?.name === 'AbortError') {
        if (attempt < maxAttempts) {
          const delay = 1200 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 650);
          await sleep(delay);
          continue;
        }
        throw fail(504, 'La IA tardó demasiado. Reintentá con menos preguntas o un PDF más corto.');
      }
      // Los errores normalizados de negocio no se reintentan fuera del bloque HTTP.
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw fail(503, 'Gemini no está disponible temporalmente. Probá más tarde.');
}

export async function previewQuestions(user, body = {}) {
  const { assignment } = await teacherAssignment(user, body.teacherSubjectId);
  const type = body.gameType;
  if (!TYPES.includes(type)) throw fail(400, 'Elegí verdadero/falso, opciones múltiples o unir conceptos.');
  const count = Number(body.count);
  if (!Number.isInteger(count) || count < 3 || count > 15) throw fail(400, 'Elegí entre 3 y 15 preguntas.');
  const instructions = String(body.instructions || '').trim();
  const docId = body.documentId == null || body.documentId === '' ? null : Number(body.documentId);
  if ((!instructions || instructions.length < 15) && !docId) throw fail(400, 'Escribí al menos 15 caracteres o seleccioná un PDF.');
  if (instructions.length > 1500) throw fail(400, 'Las instrucciones superan 1500 caracteres.');
  const pdf = docId ? await readOwnedPdf(assignment, docId) : null;
  checkLimit(user.id);
  const prompt = `Materia: ${assignment.subject.nombre}; Curso: ${assignment.course.nombre}; Año: ${assignment.course.academicYear}. ${instructions || 'Generar preguntas de los contenidos principales del material suministrado.'}`;
  const rows = await callGemini({ prompt, type, count, pdf });
  const content = normalizeGenerated(type, rows);
  return { gameType: type, content, questionCount: Object.values(content)[0].length, sourceDocument: pdf?.name || null,
    message: 'Borrador generado por IA. Revisá cada pregunta y su solución antes de guardar. Ninguna actividad se publicó.' };
}

export async function saveReviewedDraft(user, body = {}) {
  const { assignment, teacherId } = await teacherAssignment(user, body.teacherSubjectId);
  const title = cleanString(body.title, 120, 'Título');
  const type = body.gameType;
  const rows = type === 'true_false' ? body.content?.statements : type === 'multiple_choice' ? body.content?.questions : body.content?.pairs;
  const content = normalizeGenerated(type, rows);
  return createReviewedDraft({ teacherId, teacherSubjectId: assignment.id, title, description: typeof body.description === 'string' ? body.description.slice(0, 1500) : '', gameType: type, content });
}

export async function publishReviewedDraft(user, { teacherSubjectId, activityId }) {
  const { assignment, teacherId } = await teacherAssignment(user, teacherSubjectId);
  const id = Number(activityId);
  if (!Number.isSafeInteger(id) || id <= 0) throw fail(400, 'Actividad inválida.');
  const activity = await getOwnedDraft({ teacherSubjectId: assignment.id, teacherId, activityId: id });
  if (!activity || activity.status !== 'DRAFT') throw fail(409, 'La actividad no existe o ya no es un borrador.');
  if (activity.gameType === 'matching') throw fail(409, 'El minijuego de unir conceptos todavía no está integrado en Unity. Guardá el borrador, pero no se puede publicar como evaluable.');
  const rows = activity.gameType === 'true_false' ? activity.content?.statements : activity.gameType === 'multiple_choice' ? activity.content?.questions : activity.content?.pairs;
  normalizeGenerated(activity.gameType, rows);
  return updateOwnedStatus(id, 'ACTIVE');
}

export async function editReviewedDraft(user, activityId, body = {}) {
  const { assignment, teacherId } = await teacherAssignment(user, body.teacherSubjectId);
  const id = Number(activityId);
  const activity = await getOwnedDraft({ teacherSubjectId: assignment.id, teacherId, activityId: id });
  if (!activity || activity.status !== 'DRAFT') throw fail(409, 'Este borrador no existe o ya está publicado.');
  const title = cleanString(body.title, 120, 'Título');
  const type = body.gameType;
  const rows = type === 'true_false' ? body.content?.statements : type === 'multiple_choice' ? body.content?.questions : body.content?.pairs;
  const content = normalizeGenerated(type, rows);
  return updateReviewedDraft(id, { title, gameType: type, description: typeof body.description === 'string' ? body.description.slice(0, 1500) : '', content });
}

import { listUnits, createUnit, createTopic, editTopic } from '../services/unit.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';

const parseId = value => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw Object.assign(new Error('Identificador inválido.'), { status: 400 });
  return id;
};
const wrap = (fn, code = 200) => async (req, res) => {
  try { return res.status(code).json(await fn(req)); }
  catch (error) { return handleServiceError(error, res); }
};
export const list = wrap(req => listUnits(req.user, parseId(req.query.teacherSubjectId)));
export const create = wrap(req => createUnit(req.user, { ...req.body, teacherSubjectId: parseId(req.body?.teacherSubjectId) }), 201);
export const addTopic = wrap(req => createTopic(req.user, parseId(req.params.unitId), req.body), 201);
export const changeTopic = wrap(req => editTopic(req.user, parseId(req.params.unitId), parseId(req.params.topicId), req.body));

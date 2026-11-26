import { listSignupRequests, listSignupCourseGroups, reviewSignupRequests } from '../services/studentSignup.service.js';

const run = async (res, fn) => {
  try { return res.json(await fn()); }
  catch (error) {
    if (!error.status) console.error('[EduQuest][Inscripciones]', error);
    return res.status(error.status || 500).json({ message: error.status ? error.message : 'Error interno' });
  }
};

export const signupController = {
  list: (req, res) => run(res, () => listSignupRequests(req.user, req.query)),
  groups: (req, res) => run(res, () => listSignupCourseGroups(req.user, req.query)),
  approve: (req, res) => run(res, () => reviewSignupRequests(req.user, req.body, 'APPROVED')),
  reject: (req, res) => run(res, () => reviewSignupRequests(req.user, req.body, 'REJECTED')),
};

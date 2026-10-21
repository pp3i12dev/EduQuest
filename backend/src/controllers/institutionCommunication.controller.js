import { institutionCommunicationService as service } from '../services/institutionCommunication.service.js';
const handle = (fn, status = 200) => async (req, res) => {
  try { res.status(status).json(await fn(req)); }
  catch (error) {
    console.error('[InstitutionCommunications]', error);
    const code = error.status || 500;
    res.status(code).json({ message: code === 500 ? 'Error interno en comunicaciones' : error.message });
  }
};
export const institutionCommunicationController = {
  list: handle(req => service.list(req.user, req.query)),
  get: handle(req => service.get(req.user, req.params.id)),
  options: handle(req => service.options(req.user, req.query.institutionId)),
  create: handle(req => service.create(req.user, req.body), 201),
  update: handle(req => service.update(req.user, req.params.id, req.body)),
  cancel: handle(req => service.cancel(req.user, req.params.id, req.body?.reason)),
  removeFromHistory: handle(req => service.removeFromHistory(req.user, req.params.id)),
};

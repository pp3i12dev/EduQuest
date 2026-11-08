import * as service from '../services/serviceConfig.service.js';
const run = (res, task) => Promise.resolve().then(task).then(data => res.json(data)).catch(e => {
  if (!e.status) console.error('[EduQuest] Error configurando servicios:', e?.code || e?.name || 'unknown');
  res.status(e.status || 500).json({ message: e.status ? e.message : 'No se pudo completar la operación.' });
});
export const summary = (req, res) => run(res, () => service.getServicesSummary(req.user, req.query.institutionId));
export const saveSmtp = (req, res) => run(res, () => service.updateSmtpSettings(req.user, req.body?.institutionId, req.body));
export const testSmtp = (req, res) => run(res, () => service.testSmtpSettings(req.user, req.body?.institutionId));
export const saveGemini = (req, res) => run(res, () => service.updateGeminiSettings(req.user, req.body?.institutionId, req.body));
export const testGemini = (req, res) => run(res, () => service.testGeminiSettings(req.user, req.body?.institutionId));
export const generatePush = (req, res) => run(res, () => service.generatePushCredentials(req.user, req.body));
export const regeneratePush = (req, res) => run(res, () => service.regeneratePushCredentials(req.user, req.body));
export const togglePush = (req, res) => run(res, () => service.togglePushCredentials(req.user, req.body?.enabled));

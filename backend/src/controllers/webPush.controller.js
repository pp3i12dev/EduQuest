import { saveSubscription, disableSubscription, listSubscriptions, currentSubscriptionStatus, publicVapidKey, sendTestWebPush, webPushConfigured } from '../services/webPush.service.js';

const run = (res, fn) => Promise.resolve().then(fn).then(result => res.json(result))
  .catch(e => res.status(e.status || 500).json({ message: e.status ? e.message : 'Error interno de Web Push' }));
export const webPushController = {
  config: (req, res) => res.json({ enabled: webPushConfigured(), publicKey: publicVapidKey() }),
  subscribe: (req, res) => run(res, () => saveSubscription(req.user, req.body?.subscription)),
  status: (req, res) => run(res, () => currentSubscriptionStatus(req.user, req.body?.endpoint)),
  unsubscribe: (req, res) => run(res, () => disableSubscription(req.user, req.body?.endpoint)),
  devices: (req, res) => run(res, () => listSubscriptions(req.user)),
  test: (req, res) => run(res, () => sendTestWebPush(req.user, req.body?.endpoint)),
};

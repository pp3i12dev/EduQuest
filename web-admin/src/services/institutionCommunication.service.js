const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
async function request(path, token, method = 'GET', data) {
  const res = await fetch(`${BASE}/institution-communications${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || `Error HTTP ${res.status}`);
  return json;
}
export const institutionCommunicationService = {
  list: token => request('', token),
  options: token => request('/options', token),
  get: (token, id) => request(`/${id}`, token),
  create: (token, data) => request('', token, 'POST', data),
  update: (token, id, data) => request(`/${id}`, token, 'PATCH', data),
  cancel: (token, id, reason) => request(`/${id}/cancel`, token, 'PATCH', { reason }),
  removeFromHistory: (token, id) => request(`/${id}/history`, token, 'DELETE'),
};

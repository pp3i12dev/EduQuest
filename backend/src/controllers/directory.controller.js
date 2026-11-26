import { getDirectoryService, getDirectoryFiltersService, getDirectoryInstitutionsService, updateDirectoryPrivacyService } from '../services/directory.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';
export async function listDirectory(req, res) {
  try { return res.json(await getDirectoryService(req.user, req.query)); }
  catch (error) { return handleServiceError(error, res); }
}
export async function setDirectoryPrivacy(req, res) {
  try { return res.json(await updateDirectoryPrivacyService(req.user, req.body)); }
  catch (error) { return handleServiceError(error, res); }
}

export async function listDirectoryOptions(req, res) {
  try { return res.json(await getDirectoryFiltersService(req.user, req.query)); }
  catch (error) { return handleServiceError(error, res); }
}

export async function listDirectoryInstitutions(req, res) {
  try { return res.json(await getDirectoryInstitutionsService(req.user)); }
  catch (error) { return handleServiceError(error, res); }
}

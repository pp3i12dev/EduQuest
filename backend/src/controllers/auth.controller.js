import { requestPasswordReset, resetPassword } from '../services/passwordReset.service.js';
import { loginService, registerStudentService } from '../services/auth.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';
import { registerStaffService, resendVerificationService, verifyEmailService, getRegistrationAvailability } from '../services/publicRegistration.service.js';



export const login = async (req, res) => {
    try {
        const result = await loginService(req.body);
        return res.status(200).json(result);
    } catch (error) {
        return handleServiceError(error, res);
    }
};



export const registerStudent = async (req, res) => {
    try {
        const result = await registerStudentService(req.body);
        return res.status(201).json(result);
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const registerTeacher = async (req, res) => {
    // Endpoint anterior conservado para clientes antiguos, sin permitir alta directa.
    return res.status(501).json({ message: 'Utilizá /auth/register-staff para solicitar el registro.' });
};
export const registerStaff = async (req, res) => {
    try { return res.status(201).json(await registerStaffService(req.body)); }
    catch (error) { return handleServiceError(error, res); }
};
export const resendVerification = async (req, res) => {
    try { return res.json(await resendVerificationService(req.body)); }
    catch (error) { return handleServiceError(error, res); }
};
export const verifyEmail = async (req, res) => {
    try { return res.json(await verifyEmailService(req.body)); }
    catch (error) { return handleServiceError(error, res); }
};
export const forgotPassword = async (req, res) => {
  try { return res.status(200).json(await requestPasswordReset(req.body)); }
  catch (error) { return handleServiceError(error, res); }
};
export const confirmPasswordReset = async (req, res) => {
  try { return res.status(200).json(await resetPassword(req.body)); }
  catch (error) { return handleServiceError(error, res); }
};

// Estado informativo por institución, sin exponer usuario ni clave SMTP.
export const registrationStatus = async (req, res) => {
  try {
    const type = req.query.type === 'staff' ? 'staff' : 'student';
    return res.json(await getRegistrationAvailability(req.query.institutionId, { type }));
  } catch (error) { return handleServiceError(error, res); }
};

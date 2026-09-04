import * as authService from '../services/auth.service.js';

export const registerStudent = async (req, res) => {
    try {
        const result = await authService.registerStudentService(req.body);
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const registerTeacher = async (req, res) => {
    try {
        const result = await authService.registerTeacherService(req.body);
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.loginService(email, password);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
};
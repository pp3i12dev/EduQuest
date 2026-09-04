import { useMutation } from '@tanstack/react-query';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { AuthContext } from '../context/AuthContext';

export const useLogin = () => {
    const { loginContext } = useContext(AuthContext);
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (credentials) => authService.login(credentials),
        onSuccess: (res) => {
            // Si el servicio hace "return response.data", la respuesta ya es la data directa:
            const user = res.user || res.data?.user;
            const token = res.token || res.data?.token;

            loginContext(user, token);
            navigate('/dashboard');
        },
    });
};
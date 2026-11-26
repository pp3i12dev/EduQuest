using System;

namespace QuestLearn.Perfil
{
    /// <summary>
    /// Abstrae el origen de los datos (API real, base local, etc).
    /// Así el controlador de UI no depende de cómo se obtienen los datos.
    /// </summary>
    public interface IUserProfileService
    {
        void GetMyProfile(Action<UserProfileData> onSuccess, Action<string> onError);
    }

    /// <summary>
    /// Implementación de ejemplo. Reemplazar por una llamada real
    /// (UnityWebRequest a tu API, ej: GET /api/usuarios/me) cuando tengas el backend.
    /// </summary>
    public class MockUserProfileService : IUserProfileService
    {
        // Poné esto en true para simular una falla de red y probar el manejo de errores.
        public bool SimulateError = false;

        public void GetMyProfile(Action<UserProfileData> onSuccess, Action<string> onError)
        {
            if (SimulateError)
            {
                onError?.Invoke("No se pudo cargar la información del usuario.");
                return;
            }

            var data = new UserProfileData
            {
                Nombre = "Juan",
                Apellido = "Pérez",
                Dni = "44556677",
                CorreoElectronico = "juan.perez@colegio.edu.ar",
                Rol = "Estudiante",
                CuentaActiva = true
            };

            onSuccess?.Invoke(data);
        }
    }
}

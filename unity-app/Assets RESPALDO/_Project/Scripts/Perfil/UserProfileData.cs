using System;

namespace QuestLearn.Perfil
{
    /// <summary>
    /// HU-011: Datos personales que se muestran en el perfil del usuario.
    /// Coincide con los campos definidos en el criterio de aceptación "Datos Personales".
    /// </summary>
    [Serializable]
    public class UserProfileData
    {
        public string Nombre;
        public string Apellido;
        public string Dni;
        public string CorreoElectronico;
        public string Rol;          // Alumno / Docente / Preceptor / Directivo
        public bool CuentaActiva;   // true = Activa, false = Inactiva

        public string NombreCompleto => $"{Nombre} {Apellido}";
    }
}

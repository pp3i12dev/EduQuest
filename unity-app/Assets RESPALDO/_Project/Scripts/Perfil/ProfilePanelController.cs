using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace QuestLearn.Perfil
{
    /// <summary>
    /// HU-011: Consultar perfil personal.
    /// Controla los 3 estados de la pantalla: Cargando / Contenido / Error.
    /// </summary>
    public class ProfilePanelController : MonoBehaviour
    {
        [Header("Estados (activar/desactivar GameObjects)")]
        [SerializeField] private GameObject loadingState;
        [SerializeField] private GameObject contentState;
        [SerializeField] private GameObject errorState;

        [Header("Campos de datos (Contenido)")]
        [SerializeField] private TMP_Text nombreText;
        [SerializeField] private TMP_Text apellidoText;
        [SerializeField] private TMP_Text dniText;
        [SerializeField] private TMP_Text emailText;
        [SerializeField] private TMP_Text rolText;

        [Header("Estado de cuenta")]
        [SerializeField] private TMP_Text estadoCuentaText;
        [SerializeField] private Image estadoCuentaBadge;
        [SerializeField] private Color colorActivo = new Color(0.16f, 0.71f, 0.42f);   // verde
        [SerializeField] private Color colorInactivo = new Color(0.85f, 0.27f, 0.27f); // rojo

        [Header("Botones")]
        [SerializeField] private Button editarButton;
        [SerializeField] private Button volverButton;
        [SerializeField] private Button reintentarButton;

        [Header("Error")]
        [SerializeField] private TMP_Text errorMessageText;

        [Header("Navegación")]
        [SerializeField] private string menuPrincipalPanelName = "MenuPrincipal";

        private IUserProfileService _service;
        private UserProfileData _currentProfile;

        private void Awake()
        {
            // Cambiar por la implementación real conectada a tu API.
            _service = new MockUserProfileService();

            editarButton.onClick.AddListener(OnEditarClicked);
            volverButton.onClick.AddListener(OnVolverClicked);
            reintentarButton.onClick.AddListener(CargarPerfil);
        }

        private void OnEnable()
        {
            CargarPerfil();
        }

        /// <summary>
        /// Criterio "Manejo de Errores": si falla, muestra mensaje y permite reintentar.
        /// </summary>
        private void CargarPerfil()
        {
            SetState(loading: true);

            _service.GetMyProfile(
                onSuccess: profile =>
                {
                    _currentProfile = profile;
                    MostrarDatos(profile);
                    SetState(content: true);
                },
                onError: mensaje =>
                {
                    errorMessageText.text = string.IsNullOrEmpty(mensaje)
                        ? "Ocurrió un problema al cargar tus datos. Intentá nuevamente."
                        : mensaje;
                    SetState(error: true);
                });
        }

        private void MostrarDatos(UserProfileData profile)
        {
            nombreText.text = profile.Nombre;
            apellidoText.text = profile.Apellido;
            dniText.text = profile.Dni;
            emailText.text = profile.CorreoElectronico;
            rolText.text = profile.Rol;

            estadoCuentaText.text = profile.CuentaActiva ? "Activa" : "Inactiva";
            if (estadoCuentaBadge != null)
                estadoCuentaBadge.color = profile.CuentaActiva ? colorActivo : colorInactivo;
        }

        private void OnEditarClicked()
        {
            // HU-010: navegar a la pantalla de edición, pasando el perfil actual.
            // Ejemplo: UIManager.Instance.AbrirPanel("EditarPerfil", _currentProfile);
            Debug.Log("Navegar a Editar Perfil (HU-010)");
        }

        private void OnVolverClicked()
        {
            // Criterio "Navegación": volver al menú principal sin cerrar sesión.
            // Ejemplo: UIManager.Instance.AbrirPanel(menuPrincipalPanelName);
            Debug.Log($"Volver a {menuPrincipalPanelName} (sesión se mantiene activa)");
        }

        private void SetState(bool loading = false, bool content = false, bool error = false)
        {
            loadingState.SetActive(loading);
            contentState.SetActive(content);
            errorState.SetActive(error);
        }
    }
}

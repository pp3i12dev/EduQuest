using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.SceneManagement;

public class SidebarNavegacion : MonoBehaviour
{
    [Header("Nombres de las Escenas Destino")]
    [SerializeField] private string escenaInicio = "HomePage";
    [SerializeField] private string escenaUsuarios = "DesactivateUserScene"; // O el nombre de tu escena de usuarios
    [SerializeField] private string escenaRoles = "RolesScene";
    [SerializeField] private string escenaPerfil = "PerfilScene";
    [SerializeField] private string escenaReportes = "ReportesScene";
    [SerializeField] private string escenaAjustes = "AjustesScene";
    [SerializeField] private string escenaLogin = "LoginScene"; // Para cerrar sesión

    private void Start()
    {
        // Buscar todos los botones hijos dentro del Sidebar
        Button[] botones = GetComponentsInChildren<Button>(true);

        foreach (Button btn in botones)
        {
            TMP_Text textoBoton = btn.GetComponentInChildren<TMP_Text>();
            string nombreBoton = btn.gameObject.name.ToLower();
            string textoTexto = textoBoton != null ? textoBoton.text.ToLower() : "";

            // Asignar la acción de clic según el tipo de botón
            btn.onClick.RemoveAllListeners(); // Evita duplicados

            if (nombreBoton.Contains("inicio") || textoTexto.Contains("inicio"))
            {
                btn.onClick.AddListener(() => CambiarEscena(escenaInicio));
            }
            else if (nombreBoton.Contains("usuario") || textoTexto.Contains("usuario"))
            {
                btn.onClick.AddListener(() => CambiarEscena(escenaUsuarios));
            }
            else if (nombreBoton.Contains("rol") || textoTexto.Contains("rol"))
            {
                btn.onClick.AddListener(() => CambiarEscena(escenaRoles));
            }
            else if (nombreBoton.Contains("perfil") || textoTexto.Contains("perfil"))
            {
                btn.onClick.AddListener(() => CambiarEscena(escenaPerfil));
            }
            else if (nombreBoton.Contains("reporte") || textoTexto.Contains("reporte"))
            {
                btn.onClick.AddListener(() => CambiarEscena(escenaReportes));
            }
            else if (nombreBoton.Contains("ajuste") || textoTexto.Contains("ajuste"))
            {
                btn.onClick.AddListener(() => CambiarEscena(escenaAjustes));
            }
            else if (nombreBoton.Contains("cerrar") || textoTexto.Contains("cerrar"))
            {
                btn.onClick.AddListener(() => CambiarEscena(escenaLogin));
            }
        }
    }

    private void CambiarEscena(string nombreEscena)
    {
        if (!string.IsNullOrEmpty(nombreEscena))
        {
            SceneManager.LoadScene(nombreEscena);
        }
        else
        {
            Debug.LogWarning("El nombre de la escena no está configurado.");
        }
    }
}
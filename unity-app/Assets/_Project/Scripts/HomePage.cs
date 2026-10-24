using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.SceneManagement;

public class HomeAlumnoUI : MonoBehaviour
{
    [Header("Saludo y Perfil")]
    [SerializeField] private TMP_Text txtSaludo;          // Ej: "¡Hola de nuevo, Juan!"
    [SerializeField] private TMP_Text txtNombreUsuario;  // Ej: "Juan Pérez"[cite: 6]
    [SerializeField] private TMP_Text txtRolUsuario;     // Ej: "Estudiante"[cite: 6]
    [SerializeField] private Image imgAvatar;            // Imagen del avatar del alumno[cite: 6]
    [SerializeField] private Button btnEditarAvatar;     // Botón con ícono de lápiz para cambiar avatar[cite: 6]

    [Header("Estadísticas")]
    [SerializeField] private TMP_Text txtNivel;          // Ej: "5"[cite: 6]
    [SerializeField] private TMP_Text txtPuntos;         // Ej: "1.250"[cite: 6]
    [SerializeField] private TMP_Text txtMonedas;        // Ej: "320"[cite: 6]

    [Header("Botones Principales")]
    [SerializeField] private Button btnJugarPrincipal;   // Botón grande "JUGAR"[cite: 6]
    [SerializeField] private Button btnConfigurarPerfil; // Botón "Configurar Perfil"[cite: 6]
    [SerializeField] private Button btnCerrarSesion;     // Botón "Cerrar Sesión"[cite: 6]
    [SerializeField] private Button btnVerHistorialCompleto; // "Ver Historial Completo"[cite: 6]

    [Header("Menú Lateral (Sidebar)")]
    [SerializeField] private Button btnMenuInicio;
    [SerializeField] private Button btnMenuMaterias;
    [SerializeField] private Button btnMenuJugar;
    [SerializeField] private Button btnMenuHistorial;
    [SerializeField] private Button btnMenuAjustes;
    [SerializeField] private Button btnMenuCerrarSesion;

    [Header("Nombres de Escenas")]
    [SerializeField] private string escenaMaterias = "MateriasScene";
    [SerializeField] private string escenaJuego = "JuegoScene";
    [SerializeField] private string escenaHistorial = "HistorialScene";
    [SerializeField] private string escenaPerfil = "PerfilScene";
    [SerializeField] private string escenaAjustes = "AjustesScene";
    [SerializeField] private string escenaLogin = "LoginScene";

    private void Start()
    {
        ConfigurarBotones();
        CargarDatosAlumnoEjemplo();
    }

    private void ConfigurarBotones()
    {
        // Botones principales y de perfil
        if (btnJugarPrincipal != null) btnJugarPrincipal.onClick.AddListener(IrAMaterias);
        if (btnConfigurarPerfil != null) btnConfigurarPerfil.onClick.AddListener(IrAPerfil);
        if (btnCerrarSesion != null) btnCerrarSesion.onClick.AddListener(CerrarSesion);
        if (btnVerHistorialCompleto != null) btnVerHistorialCompleto.onClick.AddListener(IrAHistorial);
        if (btnEditarAvatar != null) btnEditarAvatar.onClick.AddListener(IrAPerfil);

        // Sidebar
        if (btnMenuInicio != null) btnMenuInicio.onClick.AddListener(() => Debug.Log("Ya estás en Inicio"));
        if (btnMenuMaterias != null) btnMenuMaterias.onClick.AddListener(IrAMaterias);
        if (btnMenuJugar != null) btnMenuJugar.onClick.AddListener(IrAMaterias);
        if (btnMenuHistorial != null) btnMenuHistorial.onClick.AddListener(IrAHistorial);
        if (btnMenuAjustes != null) btnMenuAjustes.onClick.AddListener(IrAAjustes);
        if (btnMenuCerrarSesion != null) btnMenuCerrarSesion.onClick.AddListener(CerrarSesion);
    }

    private void CargarDatosAlumnoEjemplo()
    {
        /*
        // Aquí puedes conectar esto con tu Base de Datos o PlayerPrefs reales.
        if (txtSaludo != null) txtSaludo.text = "¡Hola de nuevo, Juan!";[cite: 6]
        if (txtNombreUsuario != null) txtNombreUsuario.text = "Juan Pérez";[cite: 6]
        if (txtRolUsuario != null) txtRolUsuario.text = "Estudiante";[cite: 6]

        if (txtNivel != null) txtNivel.text = "5";[cite: 6]
        if (txtPuntos != null) txtPuntos.text = "1.250";[cite: 6]
        if (txtMonedas != null) txtMonedas.text = "320";[cite: 6]
        */
    }

    // --- Métodos de Navegación (Criterios de aceptación) ---
    private void IrAMaterias()
    {
        SceneManager.LoadScene(escenaMaterias);
    }

    private void IrAHistorial()
    {
        SceneManager.LoadScene(escenaHistorial);
    }

    private void IrAPerfil()
    {
        SceneManager.LoadScene(escenaPerfil);
    }

    private void IrAAjustes()
    {
        SceneManager.LoadScene(escenaAjustes);
    }

    private void CerrarSesion()
    {
        Debug.Log("Sesión cerrada correctamente.");
        SceneManager.LoadScene(escenaLogin);
    }
}
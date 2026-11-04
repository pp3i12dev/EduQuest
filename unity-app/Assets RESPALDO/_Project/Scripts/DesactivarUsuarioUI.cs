    using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class DesactivarUsuarioUI : MonoBehaviour
{
    [Header("Datos del usuario seleccionado")]
    public int usuarioId;

    [Header("Referencias de texto (Grupo_Usuario)")]
    public TMP_Text txtNombre;
    public TMP_Text txtDNI;
    public TMP_Text txtEmail;
    public TMP_Text txtRol;

    [Header("Estado del usuario")]
    public TMP_Text txtEstadoBadge;   // El texto "Activo" dentro de Badge_Activo
    public Image imgEstadoDot;        // El puntito de color dentro de Badge_Activo

    [Header("Paneles")]
    public GameObject panelConfirmacion; // Panel_Advertencia + Grupo_Botones
    public GameObject panelResultado;    // Panel_Resultado completo

    [Header("Botones")]
    public Button btnCancelar;
    public Button btnDesactivar;

    void Start()
    {
        
        btnDesactivar.onClick.AddListener(OnDesactivarClick);
        btnCancelar.onClick.AddListener(OnCancelarClick);

        // Estado inicial: se muestra la confirmación, no el resultado
        panelConfirmacion.SetActive(true);
        panelResultado.SetActive(false);
    }

    void OnDesactivarClick()
    {
        Debug.Log("Botón Desactivar usuario presionado");

        panelConfirmacion.SetActive(false);
        panelResultado.SetActive(true);

        //Cambiar Estado Actual

        Debug.Log("Botón Desactivar usuario presionado");

        panelConfirmacion.SetActive(false);
        panelResultado.SetActive(true);

        // Actualizamos el badge de estado a Inactivo
        txtEstadoBadge.text = "Inactivo";
        txtEstadoBadge.color = new Color(0.6f, 0.6f, 0.6f);
        imgEstadoDot.color = new Color(0.6f, 0.6f, 0.6f); 
    }
    

    void OnCancelarClick()
    {
        Debug.Log("Se canceló la desactivación");
    }
}
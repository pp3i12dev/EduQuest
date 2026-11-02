using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.EventSystems;

public class SidebarHoverEfecto : MonoBehaviour
{
    [Header("Colores Estado Normal (Botones generales)")]
    [SerializeField] private Color colorFondoNormal = new Color(0.08f, 0.11f, 0.22f, 1f); 
    [SerializeField] private Color colorIconoNormal = new Color(0.8f, 0.82f, 0.9f, 1f);  
    [SerializeField] private Color colorTextoNormal = new Color(0.8f, 0.82f, 0.9f, 1f);   

    [Header("Colores Estado Hover (Al pasar el puntero)")]
    [SerializeField] private Color colorFondoHover = new Color(0.18f, 0.3f, 0.6f, 1f);   
    [SerializeField] private Color colorIconoHover = Color.white;                        
    [SerializeField] private Color colorTextoHover = Color.white;                         

    [Header("Colores Especiales para Cerrar Sesión")]
    [SerializeField] private Color colorTextoCerrarSesionNormal = new Color(0.9f, 0.2f, 0.2f, 1f); // Rojo
    [SerializeField] private Color colorTextoCerrarSesionHover = new Color(1f, 0.4f, 0.4f, 1f);    // Rojo más claro al hover

    private void Start()
    {
        // Busca únicamente los componentes Button que están dentro del Sidebar
        Button[] botones = GetComponentsInChildren<Button>(true);

        foreach (Button btn in botones)
        {
            // Evitar interferencias con el sistema nativo de Unity
            btn.transition = Selectable.Transition.None;

            // 1. Imagen de fondo del botón
            Image fondoBoton = btn.GetComponent<Image>();

            // 2. Buscar el ícono y el texto dentro de los hijos del botón
            Image iconoBoton = null;
            TMP_Text textoBoton = btn.GetComponentInChildren<TMP_Text>();

            // Buscamos imágenes hijas que actúen como ícono (excluyendo el fondo principal)
            Image[] imagenesHijas = btn.GetComponentsInChildren<Image>(true);
            foreach (Image img in imagenesHijas)
            {
                if (img != fondoBoton)
                {
                    iconoBoton = img;
                    break;
                }
            }

            // Identificar si es el botón de Cerrar Sesión
            bool esCerrarSesion = btn.gameObject.name.ToLower().Contains("cerrar") || 
                                 (textoBoton != null && textoBoton.text.ToLower().Contains("cerrar"));

            // Definir colores normales y hover para este botón específico
            Color txtNormal = esCerrarSesion ? colorTextoCerrarSesionNormal : colorTextoNormal;
            Color txtHover = esCerrarSesion ? colorTextoCerrarSesionHover : colorTextoHover;
            Color icoNormal = esCerrarSesion ? colorTextoCerrarSesionNormal : colorIconoNormal;
            Color icoHover = esCerrarSesion ? colorTextoCerrarSesionHover : colorIconoHover;

            // Aplicar el estado inicial normal
            AplicarColores(fondoBoton, colorFondoNormal, iconoBoton, icoNormal, textoBoton, txtNormal);

            // Configurar EventTrigger para detectar el puntero
            EventTrigger trigger = btn.gameObject.GetComponent<EventTrigger>();
            if (trigger == null)
            {
                trigger = btn.gameObject.AddComponent<EventTrigger>();
            }
            trigger.triggers.Clear();

            // Evento: Al entrar el cursor (Hover)
            EventTrigger.Entry entryEnter = new EventTrigger.Entry { eventID = EventTriggerType.PointerEnter };
            entryEnter.callback.AddListener((data) =>
            {
                AplicarColores(fondoBoton, colorFondoHover, iconoBoton, icoHover, textoBoton, txtHover);
            });
            trigger.triggers.Add(entryEnter);

            // Evento: Al salir el cursor
            EventTrigger.Entry entryExit = new EventTrigger.Entry { eventID = EventTriggerType.PointerExit };
            entryExit.callback.AddListener((data) =>
            {
                AplicarColores(fondoBoton, colorFondoNormal, iconoBoton, icoNormal, textoBoton, txtNormal);
            });
            trigger.triggers.Add(entryExit);
        }
    }

    private void AplicarColores(Image fondo, Color cFondo, Image icono, Color cIcono, TMP_Text texto, Color cTexto)
    {
        if (fondo != null) fondo.color = cFondo;
        if (icono != null) icono.color = cIcono;
        if (texto != null) texto.color = cTexto;
    }
}
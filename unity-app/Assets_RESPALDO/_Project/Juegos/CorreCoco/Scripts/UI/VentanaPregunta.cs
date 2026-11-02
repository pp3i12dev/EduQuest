using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Ventana modal de pregunta. Arrastrar las referencias del Canvas en el Inspector.
/// Este script asume un layout tipo grid 2x2 de Toggles (como en Captura2),
/// pero funciona igual con cualquier cantidad de opciones.
/// </summary>
public class VentanaPregunta : MonoBehaviour
{
    [Header("Referencias UI - Contenido")]
    [SerializeField] private GameObject panelRaiz;
    [SerializeField] private Text textoPregunta;
    [SerializeField] private Image imagenPregunta;
    [SerializeField] private GameObject contenedorImagen; // para ocultarlo si la pregunta no tiene imagen

    [Header("Referencias UI - Opciones")]
    [Tooltip("Los Toggle deben estar ya ubicados en el Canvas en el orden de la pregunta (0,1,2,3...)")]
    [SerializeField] private List<Toggle> togglesOpciones;
    [SerializeField] private List<Text> textosOpciones;
    [SerializeField] private Button botonConfirmar;

    [Header("Referencias UI - Timer")]
    [SerializeField] private Image barraDeTiempo; // usar Image tipo "Filled"

    [Header("Referencias UI - Panel 'gente respondió' (dato falso)")]
    [SerializeField] private GameObject panelEstadisticaFalsa;
    [SerializeField] private Image barraVerdeFalsa; // fillAmount = promedio de % correctos
    [SerializeField] private Text textoVerdeFalso;
    [SerializeField] private Text textoRojoFalso;

    [Header("Puntaje")]
    [SerializeField] private int puntosPorAcierto = 10;
    [SerializeField] private int puntosDePenalizacion = 5;

    private PreguntaData preguntaActual;
    private float tiempoRestante;
    private bool ventanaActiva;

    private void Awake()
    {
        panelRaiz.SetActive(false);
        botonConfirmar.onClick.AddListener(ConfirmarRespuesta);
    }

    private void Update()
    {
        if (!ventanaActiva) return;

        // Nota: usamos Time.unscaledDeltaTime porque el juego está en Time.timeScale = 0
        tiempoRestante -= Time.unscaledDeltaTime;

        if (barraDeTiempo != null)
            barraDeTiempo.fillAmount = Mathf.Clamp01(tiempoRestante / preguntaActual.tiempoLimiteSegundos);

        if (tiempoRestante <= 0f)
        {
            ventanaActiva = false;
            EvaluadorRespuesta.EvaluarPorTimeout();
            Cerrar();
        }
    }

    public void Mostrar(PreguntaData pregunta)
    {
        preguntaActual = pregunta;
        tiempoRestante = pregunta.tiempoLimiteSegundos;
        ventanaActiva = true;

        textoPregunta.text = pregunta.textoPregunta;

        bool tieneImagen = pregunta.imagen != null;
        contenedorImagen.SetActive(tieneImagen);
        if (tieneImagen) imagenPregunta.sprite = pregunta.imagen;

        // Configura cada Toggle/Texto según la cantidad real de opciones de esta pregunta
        for (int i = 0; i < togglesOpciones.Count; i++)
        {
            bool hayOpcion = i < pregunta.opciones.Count;
            togglesOpciones[i].gameObject.SetActive(hayOpcion);
            togglesOpciones[i].isOn = false;

            if (hayOpcion)
                textosOpciones[i].text = pregunta.opciones[i].texto;
        }

        ActualizarEstadisticaFalsa(pregunta);

        panelRaiz.SetActive(true);
    }

    private void ActualizarEstadisticaFalsa(PreguntaData pregunta)
    {
        if (panelEstadisticaFalsa == null || pregunta.opciones.Count == 0) return;

        // Suma los % falsos de las opciones marcadas como correctas, solo para mostrar un dato visual
        float sumaCorrectas = 0f;
        foreach (var opcion in pregunta.opciones)
        {
            if (opcion.esCorrecta) sumaCorrectas += opcion.porcentajeGenteFalso;
        }

        float porcentajeVerde = Mathf.Clamp(sumaCorrectas, 0f, 100f);
        float porcentajeRojo = 100f - porcentajeVerde;

        if (barraVerdeFalsa != null) barraVerdeFalsa.fillAmount = porcentajeVerde / 100f;
        if (textoVerdeFalso != null) textoVerdeFalso.text = $"{porcentajeVerde:0.00}%";
        if (textoRojoFalso != null) textoRojoFalso.text = $"{porcentajeRojo:0.00}%";
    }

    private void ConfirmarRespuesta()
    {
        if (!ventanaActiva) return;
        ventanaActiva = false;

        List<int> indicesMarcados = new List<int>();
        for (int i = 0; i < togglesOpciones.Count; i++)
        {
            if (togglesOpciones[i].gameObject.activeSelf && togglesOpciones[i].isOn)
                indicesMarcados.Add(i);
        }

        EvaluadorRespuesta.Evaluar(preguntaActual, indicesMarcados, puntosPorAcierto, puntosDePenalizacion);
        Cerrar();
    }

    private void Cerrar()
    {
        panelRaiz.SetActive(false);
        GameManager.Instancia?.ReanudarJuego();
    }
}

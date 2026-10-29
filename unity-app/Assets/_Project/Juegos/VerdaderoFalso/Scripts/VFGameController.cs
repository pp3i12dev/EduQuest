using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// HU Verdadero/Falso. Se apoya en el GameManager de CorreCoco para vidas, pausa y animaciones
/// del personaje. Va en un GameObject de la escena del nivel (ej. Nivel01) y se le arrastran
/// los paneles del Canvas (los que armó Fabián en unity/HU-037-diseno-ui sirven tal cual).
/// </summary>
public class VFGameController : MonoBehaviour
{
    /// <summary>Lo setea la pantalla anterior (lista de juegos) antes de cargar la escena.</summary>
    public static int ActividadSeleccionadaId;

    [Header("Config")]
    [Tooltip("Solo para probar en el editor si no se vino desde el menú")]
    [SerializeField] private int actividadIdDePrueba = 1;
    [SerializeField] private int vidasIniciales = 3;
    [SerializeField] private float segundosFeedback = 1.2f;
    [Tooltip("Cuánto corre el personaje entre pregunta y pregunta (0 = sin correr)")]
    [SerializeField] private float segundosCorriendoEntrePreguntas = 1.5f;
    [SerializeField] private string escenaMenu = "Home";

    [Header("Panel inicio (instrucciones)")]
    [SerializeField] private GameObject panelInicio;
    [SerializeField] private Button botonComenzar;

    [Header("Panel pregunta")]
    [SerializeField] private GameObject panelPregunta;
    [SerializeField] private TextMeshProUGUI textoAfirmacion;
    [SerializeField] private TextMeshProUGUI textoContador;   // "3/10"
    [SerializeField] private Button botonVerdadero;
    [SerializeField] private Button botonFalso;
    [SerializeField] private Animator animatorTarjeta;        // opcional, trigger "Salir"

    [Header("Feedback")]
    [SerializeField] private GameObject panelCorrecta;
    [SerializeField] private TextMeshProUGUI textoCorrectaDetalle;
    [SerializeField] private GameObject panelIncorrecta;
    [SerializeField] private TextMeshProUGUI textoIncorrectaDetalle;

    [Header("Vidas (si el HUD no las maneja solo)")]
    [SerializeField] private Image[] corazones;
    [SerializeField] private Sprite corazonLleno, corazonVacio;

    [Header("Fin / resultados")]
    [SerializeField] private GameObject panelFinJuego;          // "¡Juego terminado! Obtuviste X/10"
    [SerializeField] private TextMeshProUGUI textoAciertosFin;
    [SerializeField] private GameObject panelEnviando;          // opcional: "Enviando..."
    [SerializeField] private GameObject panelErrorConexion;
    [SerializeField] private Button botonAceptarError;
    [SerializeField] private VFResultsView vistaResultados;

    private GameService gameService;
    private SessionManager session;

    private List<TrueFalseStatementDTO> preguntas;
    private TrueFalseResultsRequestDTO payload;   // "payload local del progreso de la partida"
    private int activityId, indice, vidas, aciertos;
    private float tiempoInicio;
    private bool partidaTerminada;

    private async void Start()
    {
        botonVerdadero.onClick.AddListener(() => Responder(true));
        botonFalso.onClick.AddListener(() => Responder(false));
        botonComenzar.onClick.AddListener(Comenzar);
        if (botonAceptarError) botonAceptarError.onClick.AddListener(() =>
        {
            Time.timeScale = 1f;                       // el GameManager deja el juego pausado
            SceneLoader.LoadScene(escenaMenu);
        });

        OcultarTodo();
        activityId = ActividadSeleccionadaId > 0 ? ActividadSeleccionadaId : actividadIdDePrueba;

#if UNITY_EDITOR
        if (!await PrepararServiciosEditor())
        {
            panelErrorConexion.SetActive(true);
            return;
        }
#endif

        gameService = ServiceLocator.Get<GameService>();
        session = ServiceLocator.Get<SessionManager>();

        _ = gameService.RetryPendingAsync();   // manda lo que haya quedado de partidas anteriores

        try
        {
            var juego = await gameService.GetTrueFalseGameAsync(activityId);
            preguntas = juego.statements;      // el backend ya las manda mezcladas y limitadas a 10
            PrepararPartida();
        }
        catch (Exception ex)
        {
            Debug.LogError($"[VF] No se pudieron cargar las preguntas: {ex.Message}");
            panelErrorConexion.SetActive(true);
        }
    }

    private void PrepararPartida()
    {
        vidas = vidasIniciales;
        indice = 0;
        aciertos = 0;
        payload = new TrueFalseResultsRequestDTO
        {
            partidaId = Guid.NewGuid().ToString(),
            alumnoId = session.CurrentUser != null ? session.CurrentUser.id : 0,
        };
        ActualizarCorazones();

        GameManager.Instancia?.PausarParaPregunta();   // personaje quieto mientras lee las instrucciones
        panelInicio.SetActive(true);
    }

    private void Comenzar()
    {
        panelInicio.SetActive(false);
        tiempoInicio = Time.realtimeSinceStartup;      // realtime: el juego se pausa con timeScale = 0
        MostrarPregunta();
    }

    private void MostrarPregunta()
    {
        var p = preguntas[indice];
        textoAfirmacion.text = p.text;
        textoContador.text = $"{indice + 1}/{preguntas.Count}";

        panelCorrecta.SetActive(false);
        panelIncorrecta.SetActive(false);
        panelPregunta.SetActive(true);
        SetBotones(true);

        GameManager.Instancia?.PausarParaPregunta();
    }

    private void Responder(bool eleccion)
    {
        if (partidaTerminada) return;
        SetBotones(false);                             // Bloqueo de interacción (doble toque)

        var p = preguntas[indice];
        payload.respuestasAlumno.Add(new TrueFalseAnswerDTO { statementId = p.id, respuesta = eleccion });

        bool correcta = eleccion == p.correctAnswer;
        string respuestaTxt = p.correctAnswer ? "Verdadero" : "Falso";

        if (correcta)
        {
            aciertos++;
            if (textoCorrectaDetalle) textoCorrectaDetalle.text = $"La respuesta es {respuestaTxt}.";
            panelCorrecta.SetActive(true);
            GameManager.Instancia?.NotificarResultadoRespuesta(ResultadoRespuesta.Correcta);
        }
        else
        {
            vidas--;
            ActualizarCorazones();
            if (textoIncorrectaDetalle) textoIncorrectaDetalle.text = $"La respuesta correcta es: {respuestaTxt}.";
            panelIncorrecta.SetActive(true);
            GameManager.Instancia?.NotificarResultadoRespuesta(ResultadoRespuesta.Incorrecta);
            // No llamamos GameManager.PerderVida() para no duplicar la lógica de fin de juego;
            // si el HUD de corazones escucha OnVidasCambiadas, cambiar esto por PerderVida().
        }

        StartCoroutine(SiguientePaso());
    }

    private IEnumerator SiguientePaso()
    {
        if (animatorTarjeta) animatorTarjeta.SetTrigger("Salir");   // poner el Animator en "Unscaled Time"
        yield return new WaitForSecondsRealtime(segundosFeedback);

        panelPregunta.SetActive(false);
        panelCorrecta.SetActive(false);
        panelIncorrecta.SetActive(false);
        indice++;

        if (vidas <= 0 || indice >= preguntas.Count)
        {
            FinalizarPartida(sinVidas: vidas <= 0);
            yield break;
        }

        if (segundosCorriendoEntrePreguntas > 0f)
        {
            GameManager.Instancia?.ReanudarJuego();    // el personaje corre un rato
            yield return new WaitForSecondsRealtime(segundosCorriendoEntrePreguntas);
        }
        MostrarPregunta();
    }

    private async void FinalizarPartida(bool sinVidas)
    {
        partidaTerminada = true;
        GameManager.Instancia?.PausarParaPregunta();
        payload.timeInSec = Mathf.RoundToInt(Time.realtimeSinceStartup - tiempoInicio);

        if (sinVidas)
        {
            textoAciertosFin.text = $"{aciertos} / {preguntas.Count}";
            panelFinJuego.SetActive(true);
        }
        if (panelEnviando) panelEnviando.SetActive(true);

        var resultado = await gameService.SubmitTrueFalseResultsAsync(activityId, payload);

        if (panelEnviando) panelEnviando.SetActive(false);
        panelFinJuego.SetActive(false);

        if (resultado.Success)
            vistaResultados.Mostrar(resultado.Data, payload.timeInSec);
        else
            panelErrorConexion.SetActive(true);        // "Tus respuestas se han guardado y se enviarán..."
    }

    private void SetBotones(bool activo)
    {
        botonVerdadero.interactable = activo;
        botonFalso.interactable = activo;
    }

    private void ActualizarCorazones()
    {
        if (corazones == null) return;
        for (int i = 0; i < corazones.Length; i++)
            corazones[i].sprite = i < vidas ? corazonLleno : corazonVacio;
    }

    private void OcultarTodo()
    {
        foreach (var go in new[] { panelInicio, panelPregunta, panelCorrecta, panelIncorrecta,
                                   panelFinJuego, panelEnviando, panelErrorConexion })
            if (go) go.SetActive(false);
    }

#if UNITY_EDITOR
    // Solo editor: al dar Play directo en Nivel01 no corre Bootstrap (está en la escena Boot),
    // así que creamos los servicios acá y logueamos un alumno de prueba.
    // Constantes y no [SerializeField] para no cambiar la serialización entre editor y build.
    private const string EmailDePrueba = "alumno1@eduquest.com";
    private const string PasswordDePrueba = "EduQuest123!";

    private static async Task<bool> PrepararServiciosEditor()
    {
        var sesion = TryGet<SessionManager>();
        var api = TryGet<ApiClient>();
        var auth = TryGet<AuthService>();

        if (sesion == null || api == null || auth == null)
        {
            Debug.LogWarning("[VF] Sin Bootstrap: se crean los servicios para probar en el editor.");
            sesion = new SessionManager();
            api = new ApiClient(ApiConfig.BaseUrl, sesion);
            auth = new AuthService(api, sesion);
            ServiceLocator.Register(sesion);
            ServiceLocator.Register(api);
            ServiceLocator.Register(auth);
            ServiceLocator.Register(new GameService(api));
        }
        else if (TryGet<GameService>() == null)
        {
            ServiceLocator.Register(new GameService(api));
        }

        if (sesion.IsLoggedIn) return true;

        var login = await auth.LoginAsync(new LoginRequestDTO { email = EmailDePrueba, password = PasswordDePrueba });
        if (!login.Success)
        {
            Debug.LogError($"[VF] Login de prueba falló: {login.ErrorMessage}");
            return false;
        }
        Debug.Log($"[VF] Logueado como {login.Data.user.email} (id {login.Data.user.id}).");
        return true;
    }

    private static T TryGet<T>() where T : class
    {
        try { return ServiceLocator.Get<T>(); }
        catch (KeyNotFoundException) { return null; }
    }
#endif
}

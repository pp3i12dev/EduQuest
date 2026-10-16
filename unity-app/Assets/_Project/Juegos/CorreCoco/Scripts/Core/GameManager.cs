using System;
using UnityEngine;

/// <summary>
/// Controla el estado global de la partida: puntaje, vidas, pausa y progreso del nivel.
/// Es un Singleton: se accede desde cualquier script con GameManager.Instancia
/// </summary>
public class GameManager : MonoBehaviour
{
    public static GameManager Instancia { get; private set; }

    [Header("Configuración de vidas")]
    [SerializeField] private int vidasIniciales = 3;

    [Header("Configuración de nivel")]
    [Tooltip("Distancia total (en unidades de mundo) que representa el 100% del nivel")]
    [SerializeField] private float distanciaTotalNivel = 100f;

    public int PuntajeActual { get; private set; }
    public int VidasActuales { get; private set; }
    public bool JuegoPausado { get; private set; }
    public float DistanciaRecorrida { get; private set; }

    // Eventos para que la UI (HUD) se entere de los cambios sin acoplarse directamente
    public event Action<int> OnPuntajeCambiado;
    public event Action<int> OnVidasCambiadas;
    public event Action<float> OnProgresoCambiado; // 0.0 a 1.0
    public event Action OnNivelCompletado;
    public event Action OnJuegoTerminado; // sin vidas

    // Eventos para disparar animaciones del personaje sin acoplar EvaluadorRespuesta al Animator
    public event Action OnRespuestaCorrecta;
    public event Action OnRespuestaParcial;
    public event Action OnRespuestaIncorrecta;
    public event Action OnPreguntaAbierta;
    public event Action OnPreguntaCerrada;

    private void Awake()
    {
        // Blindaje: si una sesión anterior de Play terminó con el juego pausado
        // (Time.timeScale = 0) sin pasar por ReanudarJuego, Unity no lo resetea solo
        // al volver a dar Play. Esto garantiza que cada partida arranque sin pausa.
        Time.timeScale = 1f;

        // Patrón Singleton simple. Si ya existe una instancia, destruye este duplicado.
        if (Instancia != null && Instancia != this)
        {
            Destroy(gameObject);
            return;
        }
        Instancia = this;
    }

    private void Start()
    {
        VidasActuales = vidasIniciales;
        PuntajeActual = 0;
        DistanciaRecorrida = 0f;
        OnVidasCambiadas?.Invoke(VidasActuales);
        OnPuntajeCambiado?.Invoke(PuntajeActual);
    }

    /// <summary>Suma puntos (respuesta totalmente correcta)</summary>
    public void SumarPuntos(int cantidad)
    {
        PuntajeActual += cantidad;
        OnPuntajeCambiado?.Invoke(PuntajeActual);
    }

    /// <summary>Resta puntos sin quitar vida (respuesta parcialmente correcta)</summary>
    public void RestarPuntos(int cantidad)
    {
        PuntajeActual = Mathf.Max(0, PuntajeActual - cantidad);
        OnPuntajeCambiado?.Invoke(PuntajeActual);
    }

    /// <summary>Quita una vida (respuesta totalmente incorrecta o se acabó el timer)</summary>
    public void PerderVida()
    {
        VidasActuales = Mathf.Max(0, VidasActuales - 1);
        OnVidasCambiadas?.Invoke(VidasActuales);

        if (VidasActuales <= 0)
        {
            OnJuegoTerminado?.Invoke();
        }
    }

    /// <summary>Llamado por el PlayerController cada frame para actualizar el % de nivel</summary>
    public void ActualizarDistancia(float nuevaDistanciaX)
    {
        DistanciaRecorrida = nuevaDistanciaX;
        float progreso = Mathf.Clamp01(DistanciaRecorrida / distanciaTotalNivel);
        OnProgresoCambiado?.Invoke(progreso);

        if (progreso >= 1f)
        {
            OnNivelCompletado?.Invoke();
        }
    }

    /// <summary>Pausa el juego (Time.timeScale = 0) al abrir una pregunta</summary>
    public void PausarParaPregunta()
    {
        JuegoPausado = true;
        Time.timeScale = 0f;
        OnPreguntaAbierta?.Invoke();
    }

    /// <summary>Reanuda el juego al cerrar la ventana de pregunta</summary>
    public void ReanudarJuego()
    {
        JuegoPausado = false;
        Time.timeScale = 1f;
        OnPreguntaCerrada?.Invoke();
    }

    /// <summary>Disparado por EvaluadorRespuesta para animar al personaje según el resultado</summary>
    public void NotificarResultadoRespuesta(ResultadoRespuesta resultado)
    {
        switch (resultado)
        {
            case ResultadoRespuesta.Correcta:
                OnRespuestaCorrecta?.Invoke();
                break;
            case ResultadoRespuesta.Parcial:
                OnRespuestaParcial?.Invoke();
                break;
            case ResultadoRespuesta.Incorrecta:
                OnRespuestaIncorrecta?.Invoke();
                break;
        }
    }
}

public enum ResultadoRespuesta
{
    Correcta,
    Parcial,
    Incorrecta
}
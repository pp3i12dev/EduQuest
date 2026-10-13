using UnityEngine;

/// <summary>
/// Colocar este script en cada objeto de interés del escenario (elefante, león, perro, etc.).
/// El Collider2D del objeto debe tener "Is Trigger" activado.
/// Al tocarlo el jugador, pausa el juego y avisa a la UI para que muestre la pregunta asignada.
/// </summary>
[RequireComponent(typeof(Collider2D))]
public class ObjetoDeInteres : MonoBehaviour
{
    [Tooltip("Pregunta que se muestra al tocar este objeto")]
    [SerializeField] private PreguntaData pregunta;

    [Tooltip("Referencia a la ventana de pregunta en la escena (arrastrar el objeto UI acá)")]
    [SerializeField] private VentanaPregunta ventanaPregunta;

    private bool yaFueUsado;

    private void OnTriggerEnter2D(Collider2D otro)
    {
        if (yaFueUsado) return; // evita disparar la misma pregunta dos veces
        if (!otro.CompareTag("Jugador")) return;

        yaFueUsado = true;
        GameManager.Instancia?.PausarParaPregunta();
        ventanaPregunta.Mostrar(pregunta);
    }
}

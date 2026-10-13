using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Contenido de una pregunta del quiz. Se crea como asset desde el menú:
/// Click derecho en la carpeta Data > Create > Quiz > Pregunta
///
/// Usar ScriptableObject (en vez de hardcodear texto en un script) permite que,
/// en el futuro, el docente cargue estos datos desde una UI o un archivo externo
/// sin tocar código — que es justo el requerimiento de la app grande
/// (panel CRUD del docente / generación con IA, ver Sprint 8 del proyecto).
/// </summary>
[CreateAssetMenu(fileName = "NuevaPregunta", menuName = "Quiz/Pregunta")]
public class PreguntaData : ScriptableObject
{
    [Header("Contenido")]
    [TextArea(2, 4)]
    public string textoPregunta;

    [Tooltip("Opcional: dejar vacío si la pregunta es solo texto")]
    public Sprite imagen;

    [Header("Opciones de respuesta")]
    [Tooltip("Puede tener una o varias marcadas como esCorrecta = true")]
    public List<OpcionRespuesta> opciones = new List<OpcionRespuesta>();

    [Header("Tiempo")]
    [Tooltip("Segundos disponibles para responder antes de perder una vida automáticamente")]
    [Min(1f)]
    public float tiempoLimiteSegundos = 15f;

    /// <summary>
    /// Devuelve true solo si TODAS las opciones correctas fueron marcadas
    /// y NINGUNA incorrecta fue marcada.
    /// </summary>
    public bool EsRespuestaTotalmenteCorrecta(List<int> indicesMarcados)
    {
        for (int i = 0; i < opciones.Count; i++)
        {
            bool marcada = indicesMarcados.Contains(i);
            if (marcada != opciones[i].esCorrecta)
                return false; // o marcó una incorrecta, o no marcó una correcta
        }
        return true;
    }

    /// <summary>
    /// Devuelve true si el jugador acertó al menos una opción correcta,
    /// mezclada con el caso de EsRespuestaTotalmenteCorrecta para decidir la penalización:
    /// - Ninguna correcta marcada => todas mal => pierde vida
    /// - Al menos una correcta pero no todas / o alguna incorrecta de más => parcial => pierde puntos
    /// - Todas las correctas y ninguna incorrecta => todo bien => suma puntos
    /// </summary>
    public bool TieneAlMenosUnAcierto(List<int> indicesMarcados)
    {
        foreach (int indice in indicesMarcados)
        {
            if (indice >= 0 && indice < opciones.Count && opciones[indice].esCorrecta)
                return true;
        }
        return false;
    }
}

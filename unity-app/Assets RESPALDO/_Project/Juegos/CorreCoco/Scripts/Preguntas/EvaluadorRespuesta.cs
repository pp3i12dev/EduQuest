using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Aplica la regla de puntaje acordada:
/// - Todas las opciones marcadas son incorrectas (0 aciertos)  => pierde 1 vida
/// - Al menos una correcta, pero no perfecto                    => pierde puntos
/// - Exactamente todas las correctas y ninguna incorrecta       => gana puntos
/// </summary>
public static class EvaluadorRespuesta
{
    public static void Evaluar(PreguntaData pregunta, List<int> indicesMarcados, int puntosPorAcierto, int puntosDePenalizacion)
    {
        if (GameManager.Instancia == null)
        {
            Debug.LogWarning("GameManager no encontrado en la escena.");
            return;
        }

        bool esPerfecta = pregunta.EsRespuestaTotalmenteCorrecta(indicesMarcados);
        bool tieneAlgunAcierto = pregunta.TieneAlMenosUnAcierto(indicesMarcados);

        if (esPerfecta)
        {
            GameManager.Instancia.SumarPuntos(puntosPorAcierto);
        }
        else if (tieneAlgunAcierto)
        {
            GameManager.Instancia.RestarPuntos(puntosDePenalizacion);
        }
        else
        {
            GameManager.Instancia.PerderVida();
        }
    }

    /// <summary>Se acabó el tiempo sin que el jugador confirme ninguna respuesta</summary>
    public static void EvaluarPorTimeout()
    {
        GameManager.Instancia?.PerderVida();
    }
}

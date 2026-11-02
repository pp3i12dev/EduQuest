using UnityEngine;

/// <summary>
/// Representa una única opción de respuesta dentro de una pregunta.
/// Se usa una lista de estas (no un solo índice "correcto") para soportar
/// preguntas con una o varias respuestas correctas sin cambiar la estructura después.
/// </summary>
[System.Serializable]
public class OpcionRespuesta
{
    public string texto;
    public bool esCorrecta;

    [Tooltip("Dato HARDCODEADO para la demo de la feria. No refleja estadística real todavía.")]
    [Range(0, 100)]
    public float porcentajeGenteFalso;
}

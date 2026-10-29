using System.Collections.Generic;

// Los nombres de campo coinciden con el JSON del backend (Newtonsoft respeta mayúsculas/minúsculas sin problema).

[System.Serializable]
public class TrueFalseStatementDTO
{
    public string id;            // UUID que genera el modal del docente
    public string text;
    public bool correctAnswer;   // lo necesita el cliente para el feedback inmediato y las vidas
}

[System.Serializable]
public class TrueFalseGameDTO
{
    public int activityId;
    public string title;
    public int totalQuestions;
    public List<TrueFalseStatementDTO> statements;
}

[System.Serializable]
public class TrueFalseAnswerDTO
{
    public string statementId;
    public bool respuesta;       // decisión booleana mapeada a la ID de la afirmación
}

[System.Serializable]
public class TrueFalseResultsRequestDTO
{
    public string partidaId;     // GUID generado en el cliente
    public int alumnoId;
    public int timeInSec;
    public List<TrueFalseAnswerDTO> respuestasAlumno = new List<TrueFalseAnswerDTO>();
}

[System.Serializable]
public class TrueFalseResultsResponseDTO
{
    public int attemptId;
    public int score;
    public int maxScore;
    public int hits;
    public int total;
    public float percentage;
    public bool passed;
}

// Lo que se guarda en PlayerPrefs cuando falla la red
[System.Serializable]
public class PendingTrueFalseResult
{
    public int activityId;
    public int retries;
    public TrueFalseResultsRequestDTO request;
}

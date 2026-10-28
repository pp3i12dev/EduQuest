using System;
using System.Collections.Generic;

[Serializable]
public class QuizOptionData
{
    public string text;
    public bool isCorrect;
}

[Serializable]
public class QuizQuestionData
{
    public string text;
    public List<QuizOptionData> options;
}

[Serializable]
public class CreateQuizRequestDTO
{
    public int teacherId;
    public string title;
    public string activityType;
    public List<QuizQuestionData> questions;
}

[Serializable]
public class CreateQuizResponseDTO
{
    public bool success;
    public string message;
    public int activityId;
}

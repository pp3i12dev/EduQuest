using System.Collections.Generic;

public static class QuizValidator
{
    public static bool IsValid(string title, string question, List<QuizOptionData> options)
    {
        if (string.IsNullOrWhiteSpace(title))
            return false;

        if (string.IsNullOrWhiteSpace(question))
            return false;

        if (options == null || options.Count < 2 || options.Count > 4)
            return false;

        foreach (var option in options)
        {
            if (option == null || string.IsNullOrWhiteSpace(option.text))
                return false;
        }

        int correctCount = 0;
        foreach (var option in options)
        {
            if (option.isCorrect)
                correctCount++;
        }

        return correctCount == 1;
    }
}

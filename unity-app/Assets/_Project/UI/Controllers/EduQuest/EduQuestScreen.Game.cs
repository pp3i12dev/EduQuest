using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.UIElements;

namespace EduQuest.Student
{
    public partial class EduQuestScreen
    {
        private QuestionSetDTO currentQuestions;
        private readonly Dictionary<string, bool> answers = new Dictionary<string, bool>();
        private int questionIndex;
        private float startedAt;

        private void SetupGame()
        {
            Q<Label>("game-title").text = StudentNavigation.PracticeMode ? "Modo práctica" : (StudentNavigation.ActivityName ?? "Actividad");
            Click("back", () => StudentNavigation.Go(StudentNavigation.PracticeMode ? "Practice" : "Activities"));
            Click("true", () => Answer(true));
            Click("false", () => Answer(false));
            Click("finish", () => Finish());
            Q<Button>("true").SetEnabled(false);
            Q<Button>("false").SetEnabled(false);
            Q<Button>("finish").SetEnabled(false);
            startedAt = Time.realtimeSinceStartup;
            Run(async () =>
            {
                currentQuestions = StudentNavigation.PracticeMode
                    ? await EduQuestRuntime.Student.PracticeQuestions(StudentNavigation.GameType)
                    : await EduQuestRuntime.Student.Play(StudentNavigation.ActivityId);
                if (this == null) return;
                if (currentQuestions == null || currentQuestions.gameType != "true_false")
                    throw new Exception("El servidor todavía no ofrece este juego para Unity.");
                if (currentQuestions.questions == null || currentQuestions.questions.Length == 0)
                    throw new Exception("Esta actividad no tiene preguntas publicadas.");
                questionIndex = 0;
                answers.Clear();
                DisplayQuestion();
            });
        }
        private void DisplayQuestion()
        {
            if (currentQuestions?.questions == null) return;
            bool finished = questionIndex >= currentQuestions.questions.Length;
            Q<Button>("true").SetEnabled(!finished);
            Q<Button>("false").SetEnabled(!finished);
            Q<Button>("finish").SetEnabled(finished);
            if (finished)
            {
                Q<Label>("question-position").text = "Preguntas contestadas: " + answers.Count;
                Q<Label>("question-text").text = "¡Listo! Enviá tus respuestas para conocer el resultado.";
                return;
            }
            var item = currentQuestions.questions[questionIndex];
            Q<Label>("question-position").text = "Pregunta " + (questionIndex + 1) + " de " + currentQuestions.questions.Length;
            Q<Label>("question-text").text = item.text;
        }
        private void Answer(bool value)
        {
            if (currentQuestions?.questions == null || questionIndex >= currentQuestions.questions.Length) return;
            answers[currentQuestions.questions[questionIndex].id] = value;
            questionIndex++;
            DisplayQuestion();
        }
        private void Finish()
        {
            if (currentQuestions?.questions == null || answers.Count != currentQuestions.questions.Length)
            { Status("Respondé todas las preguntas antes de finalizar."); return; }
            Q<Button>("finish").SetEnabled(false);
            Run(async () =>
            {
                try
                {
                var data = currentQuestions.questions.Select(q => new AnswerDTO { id = q.id, answer = answers[q.id] }).ToArray();
                int duration = Mathf.Clamp(Mathf.RoundToInt(Time.realtimeSinceStartup - startedAt), 0, 86400);
                var result = StudentNavigation.PracticeMode
                    ? await EduQuestRuntime.Student.CheckPractice(StudentNavigation.GameType, data)
                    : await EduQuestRuntime.Student.Complete(StudentNavigation.ActivityId, data, duration);
                if (this == null) return;
                StudentNavigation.LastResult = result;
                StudentNavigation.Go("Result");
                }
                catch
                {
                    if (this != null) Q<Button>("finish")?.SetEnabled(true);
                    throw;
                }
            });
        }
        private void SetupResult()
        {
            var last = StudentNavigation.LastResult;
            if (last == null) { StudentNavigation.Go("Home"); return; }
            Q<Label>("result-score").text = last.score + "%";
            Q<Label>("result-details").text = last.correct + " de " + last.total + " respuestas correctas" +
                (StudentNavigation.PracticeMode ? " · Modo práctica (sin nota ni recompensa)." : " · Puntos recibidos: " + last.earnedPoints) +
                "\n" + (last.message ?? "");
            Click("home", () => StudentNavigation.Go("Home"));
            Click("history", () => StudentNavigation.Go("History"));
            Click("practice", () => StudentNavigation.Go("Practice"));
        }
    }
}

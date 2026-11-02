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
        private readonly Dictionary<string, string> choiceAnswers = new Dictionary<string, string>();
        private readonly Dictionary<string, string> matchingAnswers = new Dictionary<string, string>();
        private string selectedMatchingConcept;
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
                if (currentQuestions == null || (currentQuestions.gameType != "true_false" && currentQuestions.gameType != "multiple_choice" && currentQuestions.gameType != "matching"))
                    throw new Exception("El servidor todavía no ofrece este juego para Unity.");
                if (currentQuestions.questions == null || currentQuestions.questions.Length == 0)
                    throw new Exception("Esta actividad no tiene preguntas publicadas.");
                questionIndex = 0;
                answers.Clear();
                choiceAnswers.Clear();
                matchingAnswers.Clear();
                selectedMatchingConcept = null;
                DisplayQuestion();
            });
        }
        private void DisplayQuestion()
        {
            if (currentQuestions?.questions == null) return;
            bool matching = currentQuestions.gameType == "matching";
            bool multiple = currentQuestions.gameType == "multiple_choice";
            var matchingBoard = Q<VisualElement>("matching-board");
            if (matchingBoard != null) matchingBoard.style.display = matching ? DisplayStyle.Flex : DisplayStyle.None;
            if (matching)
            {
                Q<VisualElement>("answer-options").style.display = DisplayStyle.None;
                Q<VisualElement>("boolean-answers").style.display = DisplayStyle.None;
                Q<Button>("true").SetEnabled(false);
                Q<Button>("false").SetEnabled(false);
                Q<Label>("question-position").text = "Relaciones completas: " + matchingAnswers.Count + " de " + currentQuestions.questions.Length;
                Q<Label>("question-text").text = "Tocá un concepto y luego la definición que le corresponde. Podés cambiar cualquier relación antes de finalizar.";
                Q<Button>("finish").SetEnabled(matchingAnswers.Count == currentQuestions.questions.Length);
                RenderMatchingBoard(matchingBoard);
                return;
            }
            var choicesContainer = Q<VisualElement>("answer-options");
            var boolContainer = Q<VisualElement>("boolean-answers");
            if (choicesContainer != null) choicesContainer.Clear();
            if (choicesContainer != null) choicesContainer.style.display = multiple ? DisplayStyle.Flex : DisplayStyle.None;
            if (boolContainer != null) boolContainer.style.display = multiple ? DisplayStyle.None : DisplayStyle.Flex;
            bool finished = questionIndex >= currentQuestions.questions.Length;
            Q<Button>("true").SetEnabled(!finished && !multiple);
            Q<Button>("false").SetEnabled(!finished && !multiple);
            Q<Button>("finish").SetEnabled(finished);
            if (finished)
            {
                Q<Label>("question-position").text = "Preguntas contestadas: " + (multiple ? choiceAnswers.Count : answers.Count);
                Q<Label>("question-text").text = "¡Listo! Enviá tus respuestas para conocer el resultado.";
                return;
            }
            var item = currentQuestions.questions[questionIndex];
            Q<Label>("question-position").text = "Pregunta " + (questionIndex + 1) + " de " + currentQuestions.questions.Length;
            Q<Label>("question-text").text = item.text;
            if (!multiple || choicesContainer == null) return;
            foreach (var option in item.options ?? Array.Empty<RemoteChoiceDTO>())
            {
                string optionId = option.id;
                var btn = new Button(() => AnswerChoice(optionId)) { text = option.text };
                btn.AddToClassList("secondary");
                btn.AddToClassList("choice-answer");
                choicesContainer.Add(btn);
            }
        }
        private void Answer(bool value)
        {
            if (currentQuestions?.questions == null || questionIndex >= currentQuestions.questions.Length) return;
            if (currentQuestions.gameType != "true_false") return;
            answers[currentQuestions.questions[questionIndex].id] = value;
            questionIndex++;
            DisplayQuestion();
        }
        private void AnswerChoice(string optionId)
        {
            if (currentQuestions?.questions == null || questionIndex >= currentQuestions.questions.Length) return;
            if (currentQuestions.gameType != "multiple_choice") return;
            choiceAnswers[currentQuestions.questions[questionIndex].id] = optionId;
            questionIndex++;
            DisplayQuestion();
        }
        // Minijuego de emparejamiento: dos columnas táctiles (conceptos / definiciones).
        // La clave correcta permanece en Express; Unity solo conserva las elecciones del alumno.
        private void RenderMatchingBoard(VisualElement board)
        {
            if (board == null || currentQuestions?.questions == null) return;
            board.Clear();
            var columns = new VisualElement();
            columns.AddToClassList("matching-columns");
            var left = new VisualElement();
            var right = new VisualElement();
            left.AddToClassList("matching-column");
            right.AddToClassList("matching-column");
            left.Add(Text("CONCEPTOS", "eyebrow"));
            right.Add(Text("DEFINICIONES", "eyebrow"));
            var options = currentQuestions.questions[0].options ?? Array.Empty<RemoteChoiceDTO>();
            foreach (var question in currentQuestions.questions)
            {
                var id = question.id;
                var label = question.text ?? "Concepto";
                var button = new Button(() => SelectMatchingConcept(id)) { text = label };
                button.AddToClassList("matching-tile");
                if (selectedMatchingConcept == id) button.AddToClassList("matching-selected");
                else if (matchingAnswers.ContainsKey(id)) button.AddToClassList("matching-connected");
                left.Add(button);
                if (matchingAnswers.TryGetValue(id, out var matchId))
                {
                    var matched = Array.Find(options, option => option.id == matchId);
                    left.Add(Text("→ " + (matched?.text ?? "Definición elegida"), "matching-pair-label"));
                }
            }
            foreach (var option in options)
            {
                var optionId = option.id;
                var button = new Button(() => SelectMatchingDefinition(optionId)) { text = option.text };
                button.AddToClassList("matching-tile");
                if (matchingAnswers.ContainsValue(optionId)) button.AddToClassList("matching-connected");
                right.Add(button);
            }
            columns.Add(left);
            columns.Add(right);
            board.Add(columns);
            board.Add(Text("Las relaciones se califican solo al finalizar. Una definición puede utilizarse una vez.", "muted"));
        }
        private void SelectMatchingConcept(string id)
        {
            if (currentQuestions?.gameType != "matching") return;
            selectedMatchingConcept = id;
            DisplayQuestion();
        }
        private void SelectMatchingDefinition(string optionId)
        {
            if (currentQuestions?.gameType != "matching") return;
            if (string.IsNullOrEmpty(selectedMatchingConcept))
            {
                Status("Primero tocá el concepto de la columna izquierda.");
                return;
            }
            // Si esta definición ya se eligió en otra fila, desvincularla antes de reasignarla.
            foreach (var key in matchingAnswers.Where(pair => pair.Value == optionId).Select(pair => pair.Key).ToArray())
                matchingAnswers.Remove(key);
            matchingAnswers[selectedMatchingConcept] = optionId;
            selectedMatchingConcept = null;
            Status(matchingAnswers.Count == currentQuestions.questions.Length
                ? "¡Completaste todas las relaciones! Podés finalizar."
                : "Relación guardada. Elegí el siguiente concepto.");
            DisplayQuestion();
        }
        private void Finish()
        {
            if (currentQuestions?.questions == null || (currentQuestions.gameType == "matching" ? matchingAnswers.Count : currentQuestions.gameType == "multiple_choice" ? choiceAnswers.Count : answers.Count) != currentQuestions.questions.Length)
            { Status("Respondé todas las preguntas antes de finalizar."); return; }
            Q<Button>("finish").SetEnabled(false);
            Run(async () =>
            {
                try
                {
                var data = currentQuestions.questions.Select(q =>
                    currentQuestions.gameType == "matching" ? new AnswerDTO { id = q.id, optionId = matchingAnswers[q.id] } :
                    currentQuestions.gameType == "multiple_choice" ? new AnswerDTO { id = q.id, optionId = choiceAnswers[q.id] } :
                    new AnswerDTO { id = q.id, answer = answers[q.id] }).ToArray();
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
            Q<Label>("result-score").text = last.score + "%" +
                (StudentNavigation.PracticeMode ? "" : "  ·  Nota " + last.grade.ToString("0.0") + "/10");
            Q<Label>("result-details").text = last.correct + " de " + last.total + " respuestas correctas" +
                (StudentNavigation.PracticeMode ? " · Modo práctica (sin nota ni recompensa)." : " · Puntos recibidos: " + last.earnedPoints) +
                "\n" + (last.score >= 60 ? "¡Actividad aprobada!" : "Podés seguir practicando para mejorar.") +
                "\n" + (last.message ?? "");
            RenderAttemptReview(Q<VisualElement>("review-items"), last.review);
            Click("home", () => StudentNavigation.Go("Home"));
            Click("history", () => StudentNavigation.Go("History"));
            Click("practice", () => StudentNavigation.Go("Practice"));
        }
        private static string AnswerDescription(Newtonsoft.Json.Linq.JToken answer, RemoteChoiceDTO[] options)
        {
            if (answer == null) return "Sin respuesta";
            if (answer.Type == Newtonsoft.Json.Linq.JTokenType.Boolean)
                return answer.ToObject<bool>() ? "Verdadero" : "Falso";
            string value = answer.ToString();
            foreach (var option in options ?? Array.Empty<RemoteChoiceDTO>())
                if (option.id == value) return option.text;
            return value;
        }
        private void RenderAttemptReview(VisualElement container, ReviewAnswerDTO[] review)
        {
            if (container == null) return;
            container.Clear();
            if (review == null || review.Length == 0)
            {
                container.Add(Text("Este resultado es anterior a la entrega que registra cada respuesta.", "muted"));
                return;
            }
            container.Add(Text("CORRECCIÓN PREGUNTA POR PREGUNTA", "eyebrow"));
            for (int i = 0; i < review.Length; i++)
            {
                var answer = review[i];
                var card = new VisualElement();
                card.AddToClassList("review-answer");
                card.AddToClassList(answer.isCorrect ? "review-answer-correct" : "review-answer-wrong");
                card.Add(Text((i + 1) + ". " + answer.text, "list-title"));
                card.Add(Text((answer.isCorrect ? "✓ Correcta" : "✗ Incorrecta") +
                    " · Tu respuesta: " + AnswerDescription(answer.givenAnswer, answer.options), "list-subtitle"));
                if (!answer.isCorrect)
                    card.Add(Text("Respuesta correcta: " + AnswerDescription(answer.correctAnswer, answer.options), "list-subtitle"));
                container.Add(card);
            }
        }
    }
}

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
        private bool waitingForCompetitiveConfirmation;
        private float startedAt;
        private string selectedMemoryCard;
        private readonly List<MemoryCard> memoryCards = new List<MemoryCard>();
        private sealed class MemoryCard
        {
            public string key, text;
            public bool isLeft;
        }
        private bool IsMemoryPaired(MemoryCard card) => card.isLeft
            ? choiceAnswers.ContainsKey(card.key)
            : choiceAnswers.ContainsValue(card.key);
        private void PrepareMemoryCards()
        {
            memoryCards.Clear();
            if (currentQuestions?.questions == null || currentQuestions.questions.Length == 0) return;
            foreach (var q in currentQuestions.questions)
                memoryCards.Add(new MemoryCard { key = q.id, text = q.text, isLeft = true });
            foreach (var option in currentQuestions.questions[0].options ?? Array.Empty<RemoteChoiceDTO>())
                memoryCards.Add(new MemoryCard { key = option.id, text = option.text, isLeft = false });
            var randomized = memoryCards.OrderBy(_ => UnityEngine.Random.value).ToList();
            memoryCards.Clear(); memoryCards.AddRange(randomized);
            selectedMemoryCard = null;
        }
        private bool IsExtendedGame()
        {
            if (currentQuestions == null) return false;
            string type = currentQuestions.gameType;
            return type == "sequence" || type == "classification" || type == "fill_blank" || type == "spot_error" || type == "memory";
        }

        private void SetupGame()
        {
            Q<Label>("game-title").text = StudentNavigation.PracticeMode || StudentNavigation.ActivityReplayMode
                ? "Práctica · sin puntos ni cambios en el ranking"
                : (StudentNavigation.ActivityName ?? "Actividad");
            // UI Toolkit puede heredar reglas .row y .primary que ensanchan y desplazan
            // ambos botones. El layout se fija aquí y en la clase específica eq-bool-stack.
            var booleanAnswers = Q<VisualElement>("boolean-answers");
            if (booleanAnswers != null)
            {
                booleanAnswers.style.flexDirection = FlexDirection.Column;
                booleanAnswers.style.alignItems = Align.Stretch;
                booleanAnswers.style.width = Length.Percent(100);
                booleanAnswers.style.flexGrow = 0;
                booleanAnswers.style.flexShrink = 0;
                foreach (var buttonName in new[] { "true", "false" })
                {
                    var answerButton = Q<Button>(buttonName);
                    if (answerButton == null) continue;
                    answerButton.style.width = Length.Percent(100);
                    answerButton.style.maxWidth = Length.Percent(100);
                    answerButton.style.height = 54;
                    answerButton.style.minHeight = 54;
                    answerButton.style.maxHeight = 54;
                    answerButton.style.flexGrow = 0;
                    answerButton.style.flexShrink = 0;
                    answerButton.style.marginLeft = 0;
                    answerButton.style.marginRight = 0;
                }
            }
            Click("back", () => StudentNavigation.Go(StudentNavigation.PracticeMode ? "Practice" : "Activities"));
            Click("true", () => Answer(true));
            Click("false", () => Answer(false));
            Click("finish", () => Finish());
            waitingForCompetitiveConfirmation = false;
            Q<Button>("finish").text = "Finalizar partida";
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
                if (currentQuestions == null || (currentQuestions.gameType != "true_false" && currentQuestions.gameType != "multiple_choice" && currentQuestions.gameType != "matching" && !IsExtendedGame()))
                    throw new Exception("El servidor todavía no ofrece este juego para Unity.");
                if (currentQuestions.questions == null || currentQuestions.questions.Length == 0)
                    throw new Exception("Esta actividad no tiene preguntas publicadas.");
                questionIndex = 0;
                answers.Clear();
                choiceAnswers.Clear();
                matchingAnswers.Clear();
                selectedMatchingConcept = null;
                if (currentQuestions.gameType == "memory") PrepareMemoryCards();
                if (this == null) return;
                DisplayQuestion();
            });
        }
        private void DisplayQuestion()
        {
            if (currentQuestions?.questions == null) return;
            bool matching = currentQuestions.gameType == "matching";
            if (IsExtendedGame())
            {
                RenderExtendedGame();
                return;
            }
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
        // Cuatro mecánicas táctiles que comparten el contrato QuestionSetDTO. Se mantienen en portrait.
        // La clave de cada respuesta permanece en Express; Unity solo elige identificadores opacos.
        private void RenderExtendedGame()
        {
            string type = currentQuestions.gameType;
            var board = Q<VisualElement>("answer-options");
            var matching = Q<VisualElement>("matching-board");
            var boolean = Q<VisualElement>("boolean-answers");
            if (matching != null) matching.style.display = DisplayStyle.None;
            if (boolean != null) boolean.style.display = DisplayStyle.None;
            Q<Button>("true").SetEnabled(false);
            Q<Button>("false").SetEnabled(false);
            if (board == null) return;
            board.Clear();
            board.style.display = DisplayStyle.Flex;
            var questions = currentQuestions.questions;
            if (type == "memory") { RenderMemoryBoard(board); return; }
            if (type == "sequence")
            {
                Q<Label>("question-position").text = "Pasos ordenados: " + choiceAnswers.Count + " / " + questions.Length;
                Q<Label>("question-text").text = "Tocá los pasos en el orden correcto. Si te equivocás, podés deshacer el último.";
                var chosen = new VisualElement();
                chosen.AddToClassList("game-selection-list");
                for (int i = 0; i < questions.Length; i++)
                {
                    if (choiceAnswers.TryGetValue(questions[i].id, out var selected))
                    {
                        var item = Array.Find(questions[0].options, opt => opt.id == selected);
                        chosen.Add(Text((i + 1) + ". " + (item?.text ?? "Paso"), "game-chosen-step"));
                    }
                }
                if (choiceAnswers.Count > 0)
                {
                    var undo = new Button(UndoLastSequence) { text = "↶ Deshacer último paso" };
                    undo.AddToClassList("secondary");
                    chosen.Add(undo);
                }
                board.Add(chosen);
                foreach (var option in questions[0].options ?? Array.Empty<RemoteChoiceDTO>())
                {
                    if (choiceAnswers.ContainsValue(option.id)) continue;
                    string id = option.id;
                    var tile = new Button(() => ChooseSequenceStep(id)) { text = option.text };
                    tile.AddToClassList("game-option-tile");
                    board.Add(tile);
                }
                Q<Button>("finish").SetEnabled(choiceAnswers.Count == questions.Length);
                return;
            }
            bool completed = questionIndex >= questions.Length;
            Q<Button>("finish").SetEnabled(completed);
            Q<Label>("question-position").text = completed
                ? "¡Completaste " + questions.Length + " desafíos!"
                : "Desafío " + (questionIndex + 1) + " de " + questions.Length;
            if (completed)
            {
                Q<Label>("question-text").text = "Enviá tus respuestas para conocer tu nota y los puntos recibidos.";
                return;
            }
            var current = questions[questionIndex];
            Q<Label>("question-text").text = type == "classification"
                ? "Clasificá este concepto: " + current.text
                : type == "fill_blank" ? "Completá el espacio: " + current.text
                : "Encontrá el fragmento incorrecto: " + current.text;
            if (type == "spot_error") board.Add(Text("Seleccioná el fragmento que contiene el error.", "muted"));
            foreach (var option in current.options ?? Array.Empty<RemoteChoiceDTO>())
            {
                string id = option.id;
                var tile = new Button(() => ChooseExtendedOption(id)) { text = option.text };
                tile.AddToClassList("game-option-tile");
                board.Add(tile);
            }
        }
        // Memotest real: el alumno descubre cartas y elige sus parejas.
        // La verificación permanece en Express; no enviamos el mapa correcto a Unity.
        private void RenderMemoryBoard(VisualElement board)
        {
            var qs = currentQuestions.questions;
            Q<Label>("question-position").text = "Parejas elegidas: " + choiceAnswers.Count + " / " + qs.Length;
            Q<Label>("question-text").text = "Descubrí dos tarjetas: un concepto y su definición. Al emparejarlas, quedarán visibles. La corrección se realiza al terminar.";
            Q<Button>("finish").SetEnabled(choiceAnswers.Count == qs.Length);
            var grid = new VisualElement();
            grid.AddToClassList("eq-memory-board");
            foreach (var card in memoryCards)
            {
                var current = card;
                bool paired = IsMemoryPaired(current);
                bool showing = paired || selectedMemoryCard == (current.isLeft ? "L:" : "R:") + current.key;
                var button = new Button(() => FlipMemoryCard(current)) { text = showing ? current.text : "?" };
                button.AddToClassList("eq-memory-card");
                if (showing) button.AddToClassList(paired ? "eq-memory-paired" : "eq-memory-flipped");
                button.SetEnabled(!paired);
                grid.Add(button);
            }
            board.Add(grid);
            if (selectedMemoryCard != null) board.Add(Text("Elegí ahora una carta del otro grupo.", "muted"));
            if (choiceAnswers.Count > 0)
            {
                board.Add(new Button(() => { choiceAnswers.Clear(); selectedMemoryCard = null; DisplayQuestion(); })
                    { text = "↶ Reiniciar parejas" });
            }
        }
        private void FlipMemoryCard(MemoryCard card)
        {
            if (IsMemoryPaired(card)) return;
            string currentKey = (card.isLeft ? "L:" : "R:") + card.key;
            if (selectedMemoryCard == null || selectedMemoryCard == currentKey)
            {
                selectedMemoryCard = selectedMemoryCard == currentKey ? null : currentKey;
                DisplayQuestion(); return;
            }
            bool firstLeft = selectedMemoryCard.StartsWith("L:", StringComparison.Ordinal);
            if (firstLeft == card.isLeft) { selectedMemoryCard = currentKey; DisplayQuestion(); return; }
            string left = firstLeft ? selectedMemoryCard.Substring(2) : card.key;
            string right = firstLeft ? card.key : selectedMemoryCard.Substring(2);
            choiceAnswers[left] = right;
            selectedMemoryCard = null;
            DisplayQuestion();
        }
        private void ChooseSequenceStep(string optionId)
        {
            if (!IsExtendedGame() || currentQuestions.gameType != "sequence") return;
            if (choiceAnswers.ContainsValue(optionId)) return;
            int index = choiceAnswers.Count;
            if (index >= currentQuestions.questions.Length) return;
            choiceAnswers[currentQuestions.questions[index].id] = optionId;
            DisplayQuestion();
        }
        private void UndoLastSequence()
        {
            if (choiceAnswers.Count == 0) return;
            choiceAnswers.Remove(currentQuestions.questions[choiceAnswers.Count - 1].id);
            DisplayQuestion();
        }
        private void ChooseExtendedOption(string optionId)
        {
            if (!IsExtendedGame() || currentQuestions.gameType == "sequence") return;
            if (questionIndex >= currentQuestions.questions.Length) return;
            choiceAnswers[currentQuestions.questions[questionIndex].id] = optionId;
            questionIndex++;
            DisplayQuestion();
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
            if (currentQuestions?.questions == null || (currentQuestions.gameType == "matching" ? matchingAnswers.Count : currentQuestions.gameType == "multiple_choice" || IsExtendedGame() ? choiceAnswers.Count : answers.Count) != currentQuestions.questions.Length)
            { Status("Respondé todas las preguntas antes de finalizar."); return; }
            if (!StudentNavigation.PracticeMode && !StudentNavigation.ActivityReplayMode && !waitingForCompetitiveConfirmation)
            {
                waitingForCompetitiveConfirmation = true;
                Status("Esta es tu única partida competitiva. Confirmá para registrar la nota y los puntos. Después podrás repetir solamente en modo práctica.");
                var confirmationButton = Q<Button>("finish");
                if (confirmationButton != null) confirmationButton.text = "CONFIRMAR ENTREGA";
                return;
            }
            Q<Button>("finish").SetEnabled(false);
            Run(async () =>
            {
                try
                {
                var data = currentQuestions.questions.Select(q =>
                    currentQuestions.gameType == "matching" ? new AnswerDTO { id = q.id, optionId = matchingAnswers[q.id] } :
                    (currentQuestions.gameType == "multiple_choice" || IsExtendedGame()) ? new AnswerDTO { id = q.id, optionId = choiceAnswers[q.id] } :
                    new AnswerDTO { id = q.id, answer = answers[q.id] }).ToArray();
                int duration = Mathf.Clamp(Mathf.RoundToInt(Time.realtimeSinceStartup - startedAt), 0, 86400);
                var result = StudentNavigation.PracticeMode
                    ? await EduQuestRuntime.Student.CheckPractice(StudentNavigation.GameType, data)
                    : await EduQuestRuntime.Student.Complete(StudentNavigation.ActivityId, data, duration, StudentNavigation.ActivityReplayMode);
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
            bool training = StudentNavigation.PracticeMode || StudentNavigation.ActivityReplayMode || last.practiceOnly;
            Q<Label>("result-score").text = last.score + "%" +
                (training ? "" : "\nNota: " + last.grade.ToString("0.0") + "/10");
            Q<Label>("result-details").text = last.correct + " de " + last.total + " respuestas correctas" +
                (training ? "\nPráctica: sin nueva nota, puntos ni posición en el ranking." : "\nPuntos recibidos: " + last.earnedPoints) +
                "\n" + (last.score >= 60 ? "¡Actividad aprobada!" : "Podés seguir practicando para mejorar.") +
                "\n" + (last.message ?? "");
            if (last.score >= 60) EduQuestSound.Success();
            else EduQuestSound.Failure();
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
                if (!string.IsNullOrWhiteSpace(answer.explanation)) card.Add(Text("Explicación: " + answer.explanation, "list-subtitle"));
                container.Add(card);
            }
        }
    }
}

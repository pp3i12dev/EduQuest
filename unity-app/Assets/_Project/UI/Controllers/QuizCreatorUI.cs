using System.Collections.Generic;
using System.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class QuizCreatorUI : MonoBehaviour
{
    [Header("Formulario")]
    [SerializeField] private TMP_InputField titleInput;
    [SerializeField] private TMP_InputField questionInput;

    [Header("Opciones")]
    [SerializeField] private List<QuizOptionRow> optionRows = new List<QuizOptionRow>();
    [SerializeField] private int minOptions = 2;
    [SerializeField] private int maxOptions = 4;

    [Header("Acciones")]
    [SerializeField] private Button addOptionButton;
    [SerializeField] private Button saveButton;
    [SerializeField] private Button cancelButton;

    [Header("Feedback")]
    [SerializeField] private GameObject successModal;
    [SerializeField] private TMP_Text successMessageText;

    private int teacherId;
    private string activityType = "TRIVIA";

    private void Awake()
    {
        RegisterEvents();
        EnsureMinimumRows();
        UpdateValidationState();
    }

    private void RegisterEvents()
    {
        if (titleInput != null)
            titleInput.onValueChanged.AddListener(_ => UpdateValidationState());

        if (questionInput != null)
            questionInput.onValueChanged.AddListener(_ => UpdateValidationState());

        foreach (var row in optionRows)
        {
            if (row == null)
                continue;

            if (row.optionInput != null)
                row.optionInput.onValueChanged.AddListener(_ => UpdateValidationState());

            if (row.correctToggle != null)
                row.correctToggle.onValueChanged.AddListener(_ => UpdateValidationState());
        }

        if (addOptionButton != null)
            addOptionButton.onClick.AddListener(AddOptionRow);

        if (saveButton != null)
            saveButton.onClick.AddListener(SaveQuiz);

        if (cancelButton != null)
            cancelButton.onClick.AddListener(CloseCreator);
    }

    public void SetTeacherId(int id)
    {
        teacherId = id;
    }

    public void SetActivityType(string type)
    {
        activityType = string.IsNullOrWhiteSpace(type) ? "TRIVIA" : type;
    }

    private void EnsureMinimumRows()
    {
        for (int i = 0; i < optionRows.Count; i++)
        {
            bool visible = i < minOptions;
            if (optionRows[i] != null)
                optionRows[i].SetVisible(visible);
        }
    }

    public void AddOptionRow()
    {
        if (optionRows == null)
            return;

        int visibleCount = GetVisibleRowCount();
        if (visibleCount >= maxOptions)
            return;

        for (int i = 0; i < optionRows.Count; i++)
        {
            if (optionRows[i] == null)
                continue;

            if (!optionRows[i].IsVisible())
            {
                optionRows[i].SetVisible(true);
                optionRows[i].Clear();
                break;
            }
        }

        UpdateValidationState();
    }

    private int GetVisibleRowCount()
    {
        if (optionRows == null)
            return 0;

        return optionRows.Count(row => row != null && row.IsVisible());
    }

    private void UpdateValidationState()
    {
        var options = GetActiveOptions();
        bool isValid = QuizValidator.IsValid(
            titleInput != null ? titleInput.text : string.Empty,
            questionInput != null ? questionInput.text : string.Empty,
            options
        );

        if (saveButton != null)
            saveButton.interactable = isValid;

        if (addOptionButton != null)
            addOptionButton.interactable = GetVisibleRowCount() < maxOptions;
    }

    private List<QuizOptionData> GetActiveOptions()
    {
        if (optionRows == null)
            return new List<QuizOptionData>();

        return optionRows
            .Where(row => row != null && row.IsVisible())
            .Select(row => row.ToOptionData())
            .ToList();
    }

    public void ResetForm()
    {
        if (titleInput != null)
            titleInput.text = string.Empty;

        if (questionInput != null)
            questionInput.text = string.Empty;

        foreach (var row in optionRows)
        {
            if (row == null)
                continue;

            row.Clear();
        }

        EnsureMinimumRows();
        UpdateValidationState();
    }

    private async void SaveQuiz()
    {
        var options = GetActiveOptions();

        if (!QuizValidator.IsValid(
            titleInput != null ? titleInput.text : string.Empty,
            questionInput != null ? questionInput.text : string.Empty,
            options))
        {
            return;
        }

        var request = BuildRequest(options);

        try
        {
            var activityService = ServiceLocator.Get<ActivityService>();
            var response = await activityService.CreateQuizAsync(request);

            if (response != null && response.success)
            {
                ResetForm();
                ShowSuccessMessage("Cuestionario guardado correctamente");
                return;
            }

            ShowErrorMessage(response != null ? response.message : "No se pudo guardar el cuestionario.");
        }
        catch (System.Exception ex)
        {
            ShowErrorMessage(ex.Message);
        }
    }

    private CreateQuizRequestDTO BuildRequest(List<QuizOptionData> options)
    {
        var question = new QuizQuestionData
        {
            text = questionInput != null ? questionInput.text.Trim() : string.Empty,
            options = options
        };

        return new CreateQuizRequestDTO
        {
            teacherId = teacherId,
            title = titleInput != null ? titleInput.text.Trim() : string.Empty,
            activityType = activityType,
            questions = new List<QuizQuestionData> { question }
        };
    }

    private void CloseCreator()
    {
        gameObject.SetActive(false);
    }

    private void ShowSuccessMessage(string message)
    {
        if (successModal != null)
            successModal.SetActive(true);

        if (successMessageText != null)
            successMessageText.text = message;
    }

    private void ShowErrorMessage(string message)
    {
        Debug.LogError(message);
    }
}

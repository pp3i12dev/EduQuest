using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;

public class RegisterViewController : MonoBehaviour
{
    [SerializeField] private UIDocument uiDocument;

    private TextField firstNameField, lastNameField, dniField, emailField, passwordField;
    private DropdownField institutionDropdown, careerDropdown, courseDropdown;
    private Button registerButton;
    private Label errorLabel, successLabel;

    private AuthService authService;
    private AcademicService academicService;

    // Guardamos las listas completas para poder mapear "texto elegido" -> id real
    private List<InstitutionDTO> institutions = new();
    private List<CareerDTO> careers = new();
    private List<CourseDTO> courses = new();

    async void OnEnable()
    {
        var root = uiDocument.rootVisualElement;

        firstNameField = root.Q<TextField>("firstname-field");
        lastNameField = root.Q<TextField>("lastname-field");
        dniField = root.Q<TextField>("dni-field");
        emailField = root.Q<TextField>("email-field");
        passwordField = root.Q<TextField>("password-field");

        institutionDropdown = root.Q<DropdownField>("institution-dropdown");
        careerDropdown = root.Q<DropdownField>("career-dropdown");
        courseDropdown = root.Q<DropdownField>("course-dropdown");

        registerButton = root.Q<Button>("register-button");
        errorLabel = root.Q<Label>("error-label");
        successLabel = root.Q<Label>("success-label");

        registerButton.clicked += OnRegisterClicked;
        root.Q<Button>("back-button").clicked += () => SceneLoader.LoadScene("Login");

        authService = ServiceLocator.Get<AuthService>();
        academicService = ServiceLocator.Get<AcademicService>();

        institutionDropdown.RegisterValueChangedCallback(OnInstitutionChanged);
        careerDropdown.RegisterValueChangedCallback(OnCareerChanged);

        await LoadInstitutions();
    }

    private async System.Threading.Tasks.Task LoadInstitutions()
    {
        institutions = await academicService.GetInstitutionsAsync();
        institutionDropdown.choices = institutions.ConvertAll(i => i.nombre);
        if (institutions.Count > 0) institutionDropdown.index = 0;
    }

    private async void OnInstitutionChanged(ChangeEvent<string> evt)
    {
        if (institutionDropdown.index < 0) return;

        var selectedInstitution = institutions[institutionDropdown.index];
        careers = await academicService.GetCareersAsync(selectedInstitution.id);

        careerDropdown.choices = careers.ConvertAll(c => $"{c.nombre} ({c.level})");
        courseDropdown.choices = new List<string>();

        if (careers.Count > 0) careerDropdown.index = 0;
    }

    private async void OnCareerChanged(ChangeEvent<string> evt)
    {
        if (careerDropdown.index < 0 || careers.Count == 0) return;

        var selectedCareer = careers[careerDropdown.index];
        courses = await academicService.GetCoursesAsync(selectedCareer.id);

        courseDropdown.choices = courses.ConvertAll(c => c.nombre);
        if (courses.Count > 0) courseDropdown.index = 0;
    }

    private async void OnRegisterClicked()
    {
        errorLabel.style.display = DisplayStyle.None;
        successLabel.style.display = DisplayStyle.None;

        if (institutionDropdown.index < 0 || courseDropdown.index < 0)
        {
            errorLabel.text = "Elegí institución y curso.";
            errorLabel.style.display = DisplayStyle.Flex;
            return;
        }

        registerButton.SetEnabled(false);

        var selectedInstitution = institutions[institutionDropdown.index];
        var selectedCourse = courses[courseDropdown.index];

        var request = new RegisterStudentRequestDTO
        {
            dni = dniField.value,
            email = emailField.value,
            password = passwordField.value,
            firstName = firstNameField.value,
            lastName = lastNameField.value,
            institutionId = selectedInstitution.id,
            courseId = selectedCourse.id
        };

        var result = await authService.RegisterStudentAsync(request);
        registerButton.SetEnabled(true);

        if (result.Success)
        {
            successLabel.text = result.Data.message;
            successLabel.style.display = DisplayStyle.Flex;
            await System.Threading.Tasks.Task.Delay(2000);
            SceneLoader.LoadScene("Login");
        }
        else
        {
            errorLabel.text = result.ErrorMessage;
            errorLabel.style.display = DisplayStyle.Flex;
        }
    }
}
using UnityEngine;
using UnityEngine.UIElements;

public class LoginViewController : MonoBehaviour
{
    [SerializeField] private UIDocument uiDocument;

    private TextField emailField;
    private TextField passwordField;
    private Button loginButton;
    private Label errorLabel;
    private AuthService authService;

    void OnEnable()
    {
        var root = uiDocument.rootVisualElement;

        emailField = root.Q<TextField>("email-field");
        passwordField = root.Q<TextField>("password-field");
        loginButton = root.Q<Button>("login-button");
        errorLabel = root.Q<Label>("error-label");

        loginButton.clicked += OnLoginClicked;
        root.Q<Button>("back-button").clicked += () => SceneLoader.LoadScene("Welcome");

        authService = ServiceLocator.Get<AuthService>();
    }

    private async void OnLoginClicked()
    {
        errorLabel.style.display = DisplayStyle.None;
        loginButton.SetEnabled(false);

        var request = new LoginRequestDTO
        {
            email = emailField.value,
            password = passwordField.value
        };

        var result = await authService.LoginAsync(request);
        loginButton.SetEnabled(true);

        if (result.Success)
        {
            SceneLoader.LoadScene("Home");
        }
        else
        {
            errorLabel.text = result.ErrorMessage;
            errorLabel.style.display = DisplayStyle.Flex;
        }
    }
}
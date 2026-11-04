using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.SceneManagement;
using System.Collections;

public class LoginManager : MonoBehaviour
{
    [SerializeField] private TMP_InputField emailInput;
    [SerializeField] private TMP_InputField passwordInput;
    [SerializeField] private Button loginButton;
    [SerializeField] private Button forgotPasswordButton;
    [SerializeField] private GameObject errorPanel;
    [SerializeField] private TMP_Text errorText;
    [SerializeField] private Outline emailOutline;
    [SerializeField] private Outline passwordOutline;

    private void Start()
    {
        loginButton.onClick.AddListener(OnLoginClicked);
        forgotPasswordButton.onClick.AddListener(OnForgotPasswordClicked);
        errorPanel.SetActive(false);
    }

    private void OnDestroy()
    {
        loginButton.onClick.RemoveAllListeners();
        forgotPasswordButton.onClick.RemoveAllListeners();
    }

    private void OnLoginClicked()
    {
        string email    = emailInput.text.Trim();
        string password = passwordInput.text;

        // Validación antes de llamar al backend
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
        {
            MostrarError("Completá todos los campos para continuar.");
            return;
        }

        loginButton.interactable = false;
        StartCoroutine(HacerLogin(email, password));
    }

    private IEnumerator HacerLogin(string email, string password)
    {
        yield return new WaitForSeconds(1f);

        // Credenciales simuladas (reemplazar con backend real)
        if (email == "alumno@test.com" && password == "12345678")
        {
            Debug.Log("Login exitoso como Alumno");
             SceneManager.LoadScene("AlumnoDashboardScene");
        }
        else if (email == "docente@test.com" && password == "12345678")
        {
            Debug.Log("Login exitoso como Docente");
            // SceneManager.LoadScene("DocenteDashboardScene");
        }
        else
        {
            MostrarError("Usuario o contraseña incorrectos.");
            loginButton.interactable = true;
        }
    }

    private void MostrarError(string mensaje) // Bordes rojos
    {
        errorText.text = mensaje;
        errorPanel.SetActive(true);
        emailOutline.effectColor = new Color(0.86f, 0.15f, 0.15f, 1f);
        passwordOutline.effectColor = new Color(0.86f, 0.15f, 0.15f, 1f);
        StartCoroutine(OcultarErrorDespues(4f));
    }

    private IEnumerator OcultarErrorDespues(float segundos) // Se ocultan los bordes rojos
    {
        yield return new WaitForSeconds(segundos);
        errorPanel.SetActive(false);
        emailOutline.effectColor = new Color(0.86f, 0.15f, 0.15f, 0f);
        passwordOutline.effectColor = new Color(0.86f, 0.15f, 0.15f, 0f);
    }

    private void OnForgotPasswordClicked()
    {
        Debug.Log("Ir a recuperar contraseña");
    }
}
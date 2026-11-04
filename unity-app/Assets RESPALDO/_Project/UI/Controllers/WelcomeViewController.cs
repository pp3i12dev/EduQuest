using UnityEngine;
using UnityEngine.UIElements;

public class WelcomeViewController : MonoBehaviour
{
    [SerializeField] private UIDocument uiDocument;

    void OnEnable()
    {
        var root = uiDocument.rootVisualElement;

        root.Q<Button>("login-button").clicked += () => SceneLoader.LoadScene("Login");
        root.Q<Button>("register-button").clicked += () => SceneLoader.LoadScene("Register");
        root.Q<Button>("web-admin-button").clicked += () => Application.OpenURL("http://localhost:5173/login");
    }
}
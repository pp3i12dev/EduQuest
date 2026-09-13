using UnityEngine;
using UnityEngine.UIElements;

public class HomeViewController : MonoBehaviour
{
    [SerializeField] private UIDocument uiDocument;

    void OnEnable()
    {
        var root = uiDocument.rootVisualElement;
        var sessionManager = ServiceLocator.Get<SessionManager>();

        root.Q<Label>("welcome-label").text = $"Bienvenido, {sessionManager.CurrentUser.firstName}";

        root.Q<Button>("logout-button").clicked += () =>
        {
            sessionManager.ClearSession();
            SceneLoader.LoadScene("Welcome");
        };
    }
}
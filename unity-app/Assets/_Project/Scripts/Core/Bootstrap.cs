using UnityEngine;

public class Bootstrap : MonoBehaviour
{
    void Awake()
    {
        DontDestroyOnLoad(gameObject);

        var sessionManager = new SessionManager();
        var apiClient = new ApiClient(ApiConfig.BaseUrl, sessionManager);
        var authService = new AuthService(apiClient, sessionManager);
        var academicService = new AcademicService(apiClient);
        var gameService = new GameService(apiClient);

        ServiceLocator.Register(sessionManager);
        ServiceLocator.Register(apiClient);
        ServiceLocator.Register(authService);
        ServiceLocator.Register(academicService);
        ServiceLocator.Register(gameService);

        SceneLoader.LoadScene("Welcome");
    }
}

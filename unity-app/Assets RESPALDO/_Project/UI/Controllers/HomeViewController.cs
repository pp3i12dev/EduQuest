using UnityEngine;
using UnityEngine.UIElements;

public class HomeViewController : MonoBehaviour
{
    [SerializeField] private UIDocument uiDocument;
    [SerializeField] private VisualTreeAsset gamesViewAsset; // Arrastra el GamesView.uxml desde el Inspector

    private VisualElement root;

    void OnEnable()
    {
        root = uiDocument.rootVisualElement;
        var sessionManager = ServiceLocator.Get<SessionManager>();

        root.Q<Label>("welcome-label").text = $"Bienvenido, {sessionManager.CurrentUser.firstName}";

        // Botón de Juegos: Cambia la vista actual a la lista de juegos
        root.Q<Button>("games-button").clicked += ShowGamesView;

        // Botón de Cerrar Sesión
        root.Q<Button>("logout-button").clicked += () =>
        {
            sessionManager.ClearSession();
            SceneLoader.LoadScene("Welcome");
        };

        // (Opcional) Puedes dejar listos los clics para curso y perfil
        root.Q<Button>("courses-button").clicked += () => Debug.Log("Ir a cursos");
        root.Q<Button>("profile-button").clicked += () => Debug.Log("Ir a perfil");
    }

    private void ShowGamesView()
    {
        // Limpiamos el contenido del Home y cargamos la interfaz de Juegos
        root.Clear();
        var gamesViewInstance = gamesViewAsset.Instantiate();
        root.Add(gamesViewInstance);

        // Vinculamos los botones de la nueva vista cargada dinámicamente
        gamesViewInstance.Q<Button>("play-pig-button").clicked += () =>
        {
            SceneLoader.LoadScene("PigGame_Level1"); // Reemplaza por el nombre exacto de tu escena del chanchito
        };

        gamesViewInstance.Q<Button>("back-to-home-button").clicked += () =>
        {
            // Recargamos o restauramos el Home
            SceneLoader.LoadScene("Home"); 
        };
    }
}
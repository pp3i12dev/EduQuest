using UnityEngine;
using UnityEngine.SceneManagement;

namespace EduQuest.Student
{
    // Estado de navegación, sin credenciales. La sesión JWT permanece en SessionManager.
    public static class StudentNavigation
    {
        public const string Prefix = "EQ_";
        public static int AssignmentId, ActivityId;
        public static string SubjectName, GameType = "true_false", ActivityName;
        public static bool PracticeMode;
        public static ResultDTO LastResult;
        public static bool LaunchedCorreAprende { get; private set; }

        public static void Go(string screen)
        {
            string target = Prefix + screen;
            if (!Application.CanStreamedLevelBeLoaded(target))
            {
                Debug.LogError("EduQuest: la escena '" + target + "' no figura en la Scene List activa. " +
                    "Abrí File > Build Profiles y agregala o ejecutá EduQuest > Configurar 11 escenas UI Toolkit en Build Profiles.");
                return;
            }
            SceneManager.LoadScene(target);
        }

        public static bool GoRunnerPractice()
        {
            const string runnerScene = "Nivel01";
            if (!EduQuestRuntime.Session.IsStudent()) return false;
            if (!Application.CanStreamedLevelBeLoaded(runnerScene))
            {
                Debug.LogError("EduQuest: falta Nivel01 en Build Profiles. Corré el menú EduQuest > Android > Configurar orientación y escenas.");
                return false;
            }
            // La orientación tiene que pedirse ANTES de cargar la escena.
#if UNITY_ANDROID && !UNITY_EDITOR
            Screen.orientation = ScreenOrientation.LandscapeLeft;
#endif
            LaunchedCorreAprende = true;
            Time.timeScale = 1f;
            SceneManager.LoadScene(runnerScene);
            return true;
        }

        public static void ReturnFromRunner()
        {
            Time.timeScale = 1f;
            LaunchedCorreAprende = false;
#if UNITY_ANDROID && !UNITY_EDITOR
            Screen.orientation = ScreenOrientation.Portrait;
#endif
            Go("Practice");
        }

        public static void Reset()
        {
            AssignmentId = 0;
            ActivityId = 0;
            SubjectName = null;
            ActivityName = null;
            PracticeMode = false;
            LastResult = null;
            GameType = "true_false";
            LaunchedCorreAprende = false;
        }
    }
}

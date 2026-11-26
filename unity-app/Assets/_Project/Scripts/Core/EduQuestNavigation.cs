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
        public static bool ActivityReplayMode;
        public static bool RankingRequested;
        public static ResultDTO LastResult;

        public static void Go(string screen)
        {
            string target = Prefix + screen;
            if (!Application.CanStreamedLevelBeLoaded(target))
            {
#if UNITY_EDITOR
                string editorScene = "Assets/_Project/Scenes/EduQuest/" + target + ".unity";
                if (UnityEditor.AssetDatabase.LoadAssetAtPath<UnityEditor.SceneAsset>(editorScene) != null)
                {
                    UnityEditor.SceneManagement.EditorSceneManager.LoadSceneInPlayMode(
                        editorScene, new LoadSceneParameters(LoadSceneMode.Single));
                    return;
                }
#endif
                Debug.LogError("EduQuest: la escena '" + target + "' no figura en el Build Profile activo. " +
                    "Ejecutá EduQuest > Android > Configurar orientación y escenas y verificá la Scene List de Android.");
                return;
            }
            SceneManager.LoadScene(target);
        }

        public static void Reset()
        {
            AssignmentId = 0;
            ActivityId = 0;
            SubjectName = null;
            ActivityName = null;
            PracticeMode = false;
            ActivityReplayMode = false;
            RankingRequested = false;
            LastResult = null;
            GameType = "true_false";
        }
    }
}

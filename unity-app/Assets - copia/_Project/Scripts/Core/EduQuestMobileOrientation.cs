using System;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace EduQuest.Student
{
    // Las pantallas académicas de EduQuest utilizan orientación vertical.
    public static class EduQuestMobileOrientation
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Install()
        {
            SceneManager.sceneLoaded -= OnSceneLoaded;
            SceneManager.sceneLoaded += OnSceneLoaded;
        }
        private static void OnSceneLoaded(Scene scene, LoadSceneMode mode)
        {
            if (!scene.name.StartsWith(StudentNavigation.Prefix, StringComparison.Ordinal)) return;
#if UNITY_ANDROID && !UNITY_EDITOR
            Screen.orientation = ScreenOrientation.Portrait;
#endif
        }
    }
}

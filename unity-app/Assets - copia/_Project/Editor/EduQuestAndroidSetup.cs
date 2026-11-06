#if UNITY_EDITOR
using System.Linq;
using UnityEditor;
using UnityEngine;

/// <summary>Registra únicamente las escenas académicas EduQuest.</summary>
public static class EduQuestAndroidSetup
{
    [MenuItem("EduQuest/Android/Configurar orientación y escenas")]
    public static void Configure()
    {
        PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
        PlayerSettings.allowedAutorotateToPortrait = true;
        PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
        PlayerSettings.allowedAutorotateToLandscapeLeft = false;
        PlayerSettings.allowedAutorotateToLandscapeRight = false;

        var eqNames = new [] { "Welcome", "Login", "ForgotPassword", "Register", "Home", "Subjects", "Activities",
            "Profile", "Settings", "History", "Practice", "Game", "Result" };
        var paths = eqNames.Select(n => "Assets/_Project/Scenes/EduQuest/EQ_" + n + ".unity")
            .ToArray();
        foreach (string path in paths)
        {
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(path) != null) continue;
            Debug.LogError("EduQuest Android: falta escena " + path);
            return;
        }
        var keep = EditorBuildSettings.scenes.Where(s => !paths.Contains(s.path) && !s.path.Contains("/_Project/Juegos/")).ToArray();
        EditorBuildSettings.scenes = paths.Select(p => new EditorBuildSettingsScene(p, true)).Concat(keep).ToArray();
        AssetDatabase.SaveAssets();
        Debug.Log("EduQuest Android: orientación automática permitida y 13 escenas incluidas en Shared Scene List. " +
            "EQ_* utilizan orientación vertical. Revisá la Scene List del Build Profile Android activo.");
        EditorUtility.DisplayDialog("EduQuest - Android", "Orientaciones y Scene List compartida configuradas. " +
            "Ahora abrí File > Build Profiles y activá Android. Revisá la Scene List del perfil activo.", "Aceptar");
    }
}
#endif

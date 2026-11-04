#if UNITY_EDITOR
using System.Linq;
using UnityEditor;
using UnityEngine;

/// <summary>Configura orientaciones compatibles y registra las escenas, sin tocar CorreCoco.</summary>
public static class EduQuestAndroidSetup
{
    [MenuItem("EduQuest/Android/Configurar orientación y escenas")]
    public static void Configure()
    {
        // AutoRotation en PlayerSettings permite cambiar mediante Screen.orientation
        // durante el juego. En navegación se fija Portrait; en Nivel01, LandscapeLeft.
        PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
        PlayerSettings.allowedAutorotateToPortrait = true;
        PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
        PlayerSettings.allowedAutorotateToLandscapeLeft = true;
        PlayerSettings.allowedAutorotateToLandscapeRight = true;

        var eqNames = new [] { "Welcome", "Login", "ForgotPassword", "Register", "Home", "Subjects", "Activities",
            "Profile", "Settings", "History", "Practice", "Game", "Result" };
        var paths = eqNames.Select(n => "Assets/_Project/Scenes/EduQuest/EQ_" + n + ".unity")
            .Concat(new [] { "Assets/_Project/Juegos/CorreCoco/Scenes/Nivel01.unity" }).ToArray();
        foreach (string path in paths)
        {
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(path) != null) continue;
            Debug.LogError("EduQuest Android: falta escena " + path);
            return;
        }
        var keep = EditorBuildSettings.scenes.Where(s => !paths.Contains(s.path)).ToArray();
        EditorBuildSettings.scenes = paths.Select(p => new EditorBuildSettingsScene(p, true)).Concat(keep).ToArray();
        AssetDatabase.SaveAssets();
        Debug.Log("EduQuest Android: orientación automática permitida y 14 escenas incluidas en Shared Scene List. " +
            "EQ_* usan vertical, Nivel01 horizontal. Revisá la Scene List del Build Profile Android activo.");
        EditorUtility.DisplayDialog("EduQuest - Android", "Orientaciones y Scene List compartida configuradas. " +
            "Ahora abrí File > Build Profiles y activá Android. Revisá la Scene List del perfil activo.", "Aceptar");
    }
}
#endif

#if UNITY_EDITOR
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;

// Las 11 escenas EQ_*.unity ya están en el ZIP: este menú solamente las incorpora al build.
public static class EduQuestBuildSetup
{
    [MenuItem("EduQuest/Configurar 11 escenas UI Toolkit en Build Profiles")]
    public static void Configure()
    {
        var paths = new [] { "Welcome", "Login", "Register", "Home", "Subjects", "Activities", "Profile", "History", "Practice", "Game", "Result" }
            .Select(name => "Assets/_Project/Scenes/EduQuest/EQ_" + name + ".unity").ToArray();
        foreach (var path in paths)
        {
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(path) == null)
            {
                Debug.LogError("No se encontró la escena: " + path);
                return;
            }
        }
        // EQ_Welcome primero, conservar escenas antiguas y CorreCoco, sin alterar archivos de juegos.
        var extras = EditorBuildSettings.scenes.Where(s => !paths.Contains(s.path)).ToArray();
        EditorBuildSettings.scenes = paths.Select(x => new EditorBuildSettingsScene(x, true)).Concat(extras).ToArray();
        Debug.Log("EduQuest: las 11 escenas EQ_ quedaron en la Shared Scene List. " +
                  "Si tu Build Profile tiene una Scene List propia, agregalas también allí.");
        EditorUtility.DisplayDialog("EduQuest", "Las 11 escenas se agregaron a Shared Scene List. Si tu perfil tiene Scene List propia, revisala en File > Build Profiles. Abrí EQ_Welcome y presioná Play.", "Aceptar");
    }
}
#endif

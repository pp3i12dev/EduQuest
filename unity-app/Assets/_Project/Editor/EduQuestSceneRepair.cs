#if UNITY_EDITOR
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;
using EduQuest.Student;

// Repara las REFERENCIAS de las escenas existentes. No borra GameObjects ni recrea escenas.
public static class EduQuestSceneRepair
{
    private static readonly string[] Screens =
    {
        "Welcome", "Login", "Register", "Home", "Subjects", "Activities",
        "Profile", "History", "Practice", "Game", "Result"
    };

    [MenuItem("EduQuest/Verificar y reparar conexiones UI Toolkit (sin borrar escenas)")]
    public static void Repair()
    {
        if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;

        const string root = "Assets/_Project/";
        var panel = AssetDatabase.LoadAssetAtPath<PanelSettings>(root + "UI/Resources/EduQuest/EduQuestPanel.asset");
        if (panel == null)
        {
            Debug.LogError("EduQuest: falta EduQuestPanel.asset. Revisá Assets/_Project/UI/Resources/EduQuest.");
            return;
        }

        string initial = SceneManager.GetActiveScene().path;
        int repaired = 0;
        foreach (string name in Screens)
        {
            string path = root + "Scenes/EduQuest/EQ_" + name + ".unity";
            var asset = AssetDatabase.LoadAssetAtPath<SceneAsset>(path);
            var tree = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(root + "UI/Resources/EduQuest/Views/" + name + ".uxml");
            if (asset == null || tree == null)
            {
                Debug.LogError("EduQuest: falta escena o UXML de " + name + " (" + path + ")");
                continue;
            }

            Scene scene = EditorSceneManager.OpenScene(path, OpenSceneMode.Single);
            EduQuestScreen host = scene.GetRootGameObjects()
                .SelectMany(go => go.GetComponentsInChildren<EduQuestScreen>(true))
                .FirstOrDefault();
            if (host == null)
            {
                var go = new GameObject("EduQuest UIDocument " + name);
                host = go.AddComponent<EduQuestScreen>();
            }

            UIDocument doc = host.GetComponent<UIDocument>();
            if (doc == null) doc = host.gameObject.AddComponent<UIDocument>();
            // Las asignaciones son explícitas, serializadas y visibles en Inspector.
            doc.panelSettings = panel;
            doc.visualTreeAsset = tree;
            EditorSceneManager.MarkSceneDirty(scene);
            if (EditorSceneManager.SaveScene(scene, path)) repaired++;
        }

        if (!string.IsNullOrEmpty(initial) && AssetDatabase.LoadAssetAtPath<SceneAsset>(initial) != null)
            EditorSceneManager.OpenScene(initial, OpenSceneMode.Single);
        EduQuestBuildSetup.Configure();
        Debug.Log("EduQuest: " + repaired + "/" + Screens.Length + " escenas verificadas; " +
                  "conservados los demás GameObjects y todas las carpetas de juegos.");
    }
}
#endif

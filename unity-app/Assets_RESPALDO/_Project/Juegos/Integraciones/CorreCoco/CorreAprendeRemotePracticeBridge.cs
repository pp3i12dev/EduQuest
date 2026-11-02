using System;
using System.Collections.Generic;
using System.Reflection;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace EduQuest.Student
{
    // Integra el runner original sin modificar sus 89 archivos.
    // IMPORTANTE: solo practica. Las respuestas correctas viajan al dispositivo,
    // por lo que NO se registran como evaluaciones ni otorgan recompensas.
    public class CorreAprendeRemotePracticeBridge : MonoBehaviour
    {
        private readonly List<PreguntaData> loaded = new List<PreguntaData>();
        private static readonly FieldInfo QuestionField = typeof(ObjetoDeInteres)
            .GetField("pregunta", BindingFlags.Instance | BindingFlags.NonPublic);

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Install()
        {
            SceneManager.sceneLoaded -= OnSceneLoaded;
            SceneManager.sceneLoaded += OnSceneLoaded;
        }
        private static void OnSceneLoaded(Scene scene, LoadSceneMode mode)
        {
            if (scene.name != "Nivel01" || !StudentNavigation.LaunchedCorreAprende || !EduQuestRuntime.Session.IsStudent()) return;
            if (FindFirstObjectByType<CorreAprendeRemotePracticeBridge>() != null) return;
            new GameObject("EduQuest - Banco curricular practica").AddComponent<CorreAprendeRemotePracticeBridge>();
        }
        private async void Start()
        {
            if (QuestionField == null)
            {
                Debug.LogError("EduQuest: el campo pregunta no existe en ObjetoDeInteres; revisar el adaptador.");
                return;
            }
            try
            {
                var bank = await EduQuestRuntime.Student.RunnerBank();
                if (this == null || gameObject == null) return;
                if (bank?.questions == null || bank.questions.Length == 0)
                {
                    Debug.LogWarning("EduQuest: no hay preguntas de opciones multiples publicadas para el curso; el runner conserva el contenido de demostracion local.");
                    return;
                }
                var objects = FindObjectsByType<ObjetoDeInteres>(FindObjectsSortMode.None);
                if (objects.Length == 0) { Debug.LogWarning("EduQuest: no se encontraron objetos con preguntas en la escena Nivel01."); return; }
                for (int i = 0; i < objects.Length; i++)
                {
                    var item = bank.questions[i % bank.questions.Length];
                    var data = ScriptableObject.CreateInstance<PreguntaData>();
                    data.name = "Curricular practica " + item.id;
                    data.textoPregunta = item.text;
                    data.opciones = new List<OpcionRespuesta>();
                    foreach (var option in item.options ?? Array.Empty<RemoteChoiceDTO>())
                    {
                        data.opciones.Add(new OpcionRespuesta
                        {
                            texto = option.text,
                            esCorrecta = option.id == item.correctAnswer,
                        });
                    }
                    if (data.opciones.Count == 0) { Destroy(data); continue; }
                    loaded.Add(data);
                    QuestionField.SetValue(objects[i], data);
                }
                Debug.Log($"EduQuest: cargadas {bank.questions.Length} preguntas curriculares de practica en {objects.Length} objetos del runner.");
            }
            catch (Exception error)
            {
                Debug.LogWarning("EduQuest: no se pudo cargar el banco curricular de practica. " + error.Message);
            }
        }
        private void OnDestroy()
        {
            foreach (var item in loaded) if (item != null) Destroy(item);
            loaded.Clear();
        }
    }
}

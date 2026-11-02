using System;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace EduQuest.Student
{
    /// <summary>
    /// Orientación para EduQuest en Android.
    /// EQ_* usa vertical; el runner Nivel01 usa horizontal.
    /// El acceso desde Práctica añade un botón de regreso sin modificar CorreCoco.
    /// Este archivo no depende de integraciones opcionales aún no instaladas.
    /// </summary>
    public static class EduQuestMobileOrientation
    {
        private const string RunnerScene = "Nivel01";
        private const string ReturnCanvasName = "EduQuest - Volver a practica";

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Install()
        {
            // Evita registrar múltiples veces el mismo callback al recargar el dominio.
            SceneManager.sceneLoaded -= OnSceneLoaded;
            SceneManager.sceneLoaded += OnSceneLoaded;
        }

        private static void OnSceneLoaded(Scene scene, LoadSceneMode mode)
        {
            bool isRunner = string.Equals(scene.name, RunnerScene, StringComparison.Ordinal);
            bool isEduQuestScreen = scene.name.StartsWith(StudentNavigation.Prefix, StringComparison.Ordinal);

            if (!isRunner && !isEduQuestScreen)
                return;

#if UNITY_ANDROID && !UNITY_EDITOR
            // Mantener fijas las orientaciones por tipo de pantalla.
            Screen.orientation = isRunner ? ScreenOrientation.LandscapeLeft : ScreenOrientation.Portrait;
#endif

            // Sólo aparece si el runner se abrió desde Práctica.
            // Las preguntas originales del nivel siguen siendo locales.
            if (isRunner && StudentNavigation.LaunchedCorreAprende)
                CreatePracticeReturnUI();
        }

        private static void CreatePracticeReturnUI()
        {
            if (GameObject.Find(ReturnCanvasName) != null)
                return;

            // El juego Nivel01 ya incorpora su EventSystem para atender los botones.
            var root = new GameObject(
                ReturnCanvasName,
                typeof(RectTransform),
                typeof(Canvas),
                typeof(CanvasScaler),
                typeof(GraphicRaycaster));

            var canvas = root.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.overrideSorting = true;
            canvas.sortingOrder = 30000;

            var scaler = root.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;

            var buttonObject = new GameObject(
                "Volver a practica",
                typeof(RectTransform),
                typeof(Image),
                typeof(Button));
            buttonObject.transform.SetParent(root.transform, false);

            var buttonRect = buttonObject.GetComponent<RectTransform>();
            buttonRect.anchorMin = new Vector2(1f, 1f);
            buttonRect.anchorMax = new Vector2(1f, 1f);
            buttonRect.pivot = new Vector2(1f, 1f);
            buttonRect.anchoredPosition = new Vector2(-40f, -35f);
            buttonRect.sizeDelta = new Vector2(295f, 85f);

            var background = buttonObject.GetComponent<Image>();
            background.color = new Color(0.06f, 0.17f, 0.30f, 0.95f);

            var button = buttonObject.GetComponent<Button>();
            button.onClick.AddListener(StudentNavigation.ReturnFromRunner);

            AddLabel(buttonObject.transform, "VOLVER A PRACTICA", 25, TextAnchor.MiddleCenter);

            var noticeObject = new GameObject("Modo practica", typeof(RectTransform));
            noticeObject.transform.SetParent(root.transform, false);

            var noticeRect = noticeObject.GetComponent<RectTransform>();
            noticeRect.anchorMin = new Vector2(0f, 0f);
            noticeRect.anchorMax = new Vector2(0f, 0f);
            noticeRect.pivot = new Vector2(0f, 0f);
            noticeRect.anchoredPosition = new Vector2(32f, 24f);
            noticeRect.sizeDelta = new Vector2(860f, 66f);

            AddLabel(noticeObject.transform,
                "PRACTICA CURRICULAR - SIN NOTA NI PUNTOS",
                23, TextAnchor.MiddleLeft);
        }

        private static void AddLabel(Transform parent, string text, int fontSize, TextAnchor alignment)
        {
            var labelObject = new GameObject("Texto", typeof(RectTransform), typeof(Text));
            labelObject.transform.SetParent(parent, false);

            var rect = labelObject.GetComponent<RectTransform>();
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;

            var label = labelObject.GetComponent<Text>();
            label.text = text;
            label.fontSize = fontSize;
            label.alignment = alignment;
            label.color = Color.white;
            label.raycastTarget = false;
            label.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        }
    }
}

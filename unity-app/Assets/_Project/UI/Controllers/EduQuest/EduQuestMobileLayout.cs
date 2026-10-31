using UnityEngine;
using UnityEngine.UIElements;

namespace EduQuest.Student
{
    /// <summary>
    /// UI Toolkit en móviles: referencia 430x932 para vertical, adaptación a muescas,
    /// botones de tacto y barra inferior en lugar de sidebar de escritorio.
    /// No cambia UIDocument, prefabs ni escenas del runner.
    /// </summary>
    public static class EduQuestMobileLayout
    {
        private static int lastWidth = -1, lastHeight = -1;
        private static Rect lastSafe;
        private static VisualElement lastRoot;

        public static void Apply(VisualElement root, PanelSettings panel)
        {
            if (root == null || panel == null) return;
            lastRoot = null; // fuerza actualización al abrir cada escena
            Refresh(root, panel);
        }

        public static void Refresh(VisualElement root, PanelSettings panel)
        {
            if (root == null || panel == null) return;
            int width = Screen.width, height = Screen.height;
            Rect safe = Screen.safeArea;
            if (root == lastRoot && lastWidth == width && lastHeight == height && safe == lastSafe) return;
            lastRoot = root; lastWidth = width; lastHeight = height; lastSafe = safe;

            // Unity modifica el tamaño lógico cuando se rota el dispositivo Android.
            bool isPortrait = height >= width;
            Vector2Int reference = isPortrait ? new Vector2Int(430, 932) : new Vector2Int(932, 430);
            if (panel.referenceResolution != reference) panel.referenceResolution = reference;

            VisualElement screen = root.Q<VisualElement>(className: "screen");
            if (screen == null) return;
            screen.AddToClassList("mobile-portrait");
            // Los nombres están en el UXML; el dock se muestra con palabras cortas.
            Rename(root, "nav-home", "Inicio");
            Rename(root, "nav-subjects", "Materias");
            Rename(root, "nav-practice", "Jugar");
            Rename(root, "nav-history", "Historial");
            Rename(root, "nav-profile", "Perfil");
            Rename(root, "nav-logout", "Salir");

            // Cálculo aproximado de px físicos → unidades del panel, que respeta
            // la Safe Area en dispositivos con notch y Android 15+.
            float factorX = width > 0 ? (float)reference.x / width : 1f;
            float factorY = height > 0 ? (float)reference.y / height : 1f;
            screen.style.paddingLeft = Mathf.Max(0f, safe.xMin * factorX);
            screen.style.paddingRight = Mathf.Max(0f, (width - safe.xMax) * factorX);
            screen.style.paddingTop = Mathf.Max(0f, (height - safe.yMax) * factorY);
            screen.style.paddingBottom = Mathf.Max(0f, safe.yMin * factorY);
        }

        private static void Rename(VisualElement root, string id, string text)
        {
            var button = root.Q<Button>(id);
            if (button != null) button.text = text;
        }
    }
}

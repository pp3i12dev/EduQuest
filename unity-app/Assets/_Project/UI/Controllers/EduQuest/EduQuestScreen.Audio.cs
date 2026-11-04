using UnityEngine.UIElements;

namespace EduQuest.Student
{
    public partial class EduQuestScreen
    {
        // Escucha los botones de la escena, incluidos los creados en tiempo de ejecución
        // (respuestas, avatares, resultados e historial). Evita tocar cada botón a mano.
        private void SetupGlobalAudio()
        {
            EduQuestSound.Prepare();
            root.RegisterCallback<ClickEvent>(OnUiClick, TrickleDown.TrickleDown);
        }

        private void OnUiClick(ClickEvent evt)
        {
            var element = evt.target as VisualElement;
            while (element != null && element != root)
            {
                if (element is Button button)
                {
                    if (button.enabledInHierarchy && !button.ClassListContains("eq-review-audio"))
                    {
                        string id = button.name ?? "";
                        bool navigation = id == "back" || id == "close-menu" ||
                            id == "home" || id == "history" || id == "practice" ||
                            id == "nav-logout" || id.StartsWith("nav-") || id.StartsWith("go-");
                        if (navigation) EduQuestSound.Back();
                        else EduQuestSound.Tap();
                    }
                    break;
                }
                element = element.parent;
            }
        }

        private void SetupAudioPreferences()
        {
            var container = Q<VisualElement>("audio-settings");
            var toggle = Q<Button>("audio-toggle");
            if (container == null || toggle == null) return;

            void RefreshLabel()
            {
                toggle.text = EduQuestSound.Enabled ? "Sonidos: ACTIVADOS" : "Sonidos: DESACTIVADOS";
            }
            RefreshLabel();
            toggle.clicked += () =>
            {
                bool enable = !EduQuestSound.Enabled;
                EduQuestSound.SetEnabled(enable);
                RefreshLabel();
                if (enable) EduQuestSound.Tap();
            };

            var slider = new Slider("Volumen", 0f, 1f) { value = EduQuestSound.Volume };
            slider.AddToClassList("eq-audio-volume");
            slider.RegisterValueChangedCallback(e => EduQuestSound.SetVolume(e.newValue));
            container.Add(slider);
        }
    }
}

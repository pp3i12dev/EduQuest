using System;
using UnityEngine;
using UnityEngine.UIElements;

namespace EduQuest.Student
{
    // Selector de avatares: se consulta/guarda en PostgreSQL a través del backend.
    // No se utiliza PlayerPrefs ni se modifica ninguna escena ni la lógica de juegos.
    public partial class EduQuestScreen
    {
        private static readonly string[] BoyAvatars =
            { "boy_01", "boy_02", "boy_03", "boy_04", "boy_05", "boy_06" };
        private static readonly string[] GirlAvatars =
            { "girl_01", "girl_02", "girl_03", "girl_04", "girl_05", "girl_06" };

        private static string savedAvatarId = "boy_01";
        private static int savedAvatarUserId = -1;
        private string pendingAvatarId = "boy_01";
        private bool girlsVisible;
        private static int avatarRequestEpoch;

        private static string SafeAvatarId(string value)
        {
            foreach (var id in BoyAvatars) if (id == value) return id;
            foreach (var id in GirlAvatars) if (id == value) return id;
            return "boy_01";
        }

        private static void SetCachedAvatar(int userId, string avatarId)
        {
            savedAvatarUserId = userId;
            savedAvatarId = SafeAvatarId(avatarId);
        }

        private void ShowSavedAvatar()
        {
            if (root == null) return;
            var user = EduQuestRuntime.Session.CurrentUser;
            if (user == null) return;
            if (savedAvatarUserId != user.id) SetCachedAvatar(user.id, "boy_01");

            PaintAvatar(Q<VisualElement>("avatar"), savedAvatarId);
            PaintAvatar(Q<VisualElement>("drawer-avatar"), savedAvatarId);
            // En Perfil no debe conservarse el avatar fijo predefinido.
            if (currentScene == "Profile")
                PaintAvatar(Q<VisualElement>("profile-avatar-preview"), pendingAvatarId);
        }

        private static void PaintAvatar(VisualElement element, string avatarId)
        {
            if (element == null) return;
            // Los PNG de Unity pueden importarse como Texture2D o como Sprite.
            // No depender de que el importador permita leer la textura directamente.
            var key = "EduQuest/Avatars/" + SafeAvatarId(avatarId);
            var sprite = Resources.Load<Sprite>(key);
            var tex = Resources.Load<Texture2D>(key);
            if (sprite != null) element.style.backgroundImage = new StyleBackground(sprite);
            else if (tex != null) element.style.backgroundImage = new StyleBackground(tex);
            else { Debug.LogWarning("EduQuest: avatar no importado en Resources: " + key); return; }
            element.style.unityBackgroundScaleMode = element.name == "drawer-avatar" ? ScaleMode.ScaleAndCrop : ScaleMode.ScaleToFit;
        }

        // Se invoca al abrir cada pantalla autenticada. En el Home el resultado
        // también actualiza el avatar del menú lateral.
        private async void RefreshSavedAvatar()
        {
            if (!EduQuestRuntime.Session.IsStudent()) return;
            int epoch = avatarRequestEpoch;
            try
            {
                var response = await EduQuestRuntime.Student.Avatar();
                if (this == null || !EduQuestRuntime.Session.IsStudent() || epoch != avatarRequestEpoch) return;
                var user = EduQuestRuntime.Session.CurrentUser;
                if (user == null) return;
                SetCachedAvatar(user.id, response?.avatarId);
                ShowSavedAvatar();
                if (currentScene == "Profile")
                {
                    pendingAvatarId = savedAvatarId;
                    girlsVisible = pendingAvatarId.StartsWith("girl_", StringComparison.Ordinal);
                    RenderAvatarOptions();
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning("EduQuest: no se pudo cargar el avatar: " + ex.Message);
                // Se usa el avatar por defecto, pero no se pierde la posibilidad
                // de volver a intentar el guardado desde Mi perfil.
            }
        }

        private void SetupAvatarPicker()
        {
            pendingAvatarId = savedAvatarId;
            girlsVisible = pendingAvatarId.StartsWith("girl_", StringComparison.Ordinal);
            Click("avatar-boys", () => { girlsVisible = false; RenderAvatarOptions(); });
            Click("avatar-girls", () => { girlsVisible = true; RenderAvatarOptions(); });
            Click("save-avatar", () => Run(async () =>
            {
                string chosen = pendingAvatarId;
                // Impide que una consulta anterior pise la selección recién guardada.
                avatarRequestEpoch++;
                var response = await EduQuestRuntime.Student.UpdateAvatar(chosen);
                if (this == null) return;
                var user = EduQuestRuntime.Session.CurrentUser;
                if (user != null) SetCachedAvatar(user.id, response.avatarId);
                ShowSavedAvatar();
                RenderAvatarOptions();
                Status("¡Avatar guardado! Lo vas a ver también en Inicio.", true);
            }));
            RenderAvatarOptions();
        }

        private void RenderAvatarOptions()
        {
            if (root == null) return;
            var grid = Q<VisualElement>("avatar-grid");
            if (grid == null) return;
            grid.Clear();
            foreach (var id in girlsVisible ? GirlAvatars : BoyAvatars)
            {
                string chosenId = id;
                var item = new Button(() =>
                {
                    pendingAvatarId = chosenId;
                    RenderAvatarOptions();
                });
                item.AddToClassList("eq-avatar-item");
                if (pendingAvatarId == chosenId) item.AddToClassList("eq-avatar-selected");
                item.tooltip = chosenId.Replace('_', ' ');
                item.text = "";
                PaintAvatar(item, chosenId);
                grid.Add(item);
            }
            var boys = Q<Button>("avatar-boys");
            var girls = Q<Button>("avatar-girls");
            boys?.EnableInClassList("eq-avatar-tab-active", !girlsVisible);
            girls?.EnableInClassList("eq-avatar-tab-active", girlsVisible);
            PaintAvatar(Q<VisualElement>("profile-avatar-preview"), pendingAvatarId);
        }
    }
}

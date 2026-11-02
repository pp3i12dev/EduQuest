using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EduQuest.Student;
using UnityEngine;
using UnityEngine.UIElements;

namespace EduQuest.Student
{
    public static class EduQuestRuntime
    {
        // Una sesión compartida en RAM durante el proceso de Unity, sin PlayerPrefs.
        public static readonly SessionManager Session = new SessionManager();
        public static readonly ApiClient Api = new ApiClient(ApiConfig.BaseUrl, Session);
        public static readonly AuthService Auth = new AuthService(Api, Session);
        public static readonly AcademicService Academic = new AcademicService(Api);
        public static readonly StudentGateway Student = new StudentGateway(Api);
    }

    // Host único: cada escena EQ_* carga su UXML+USS, y enlaza sus botones en el Start.
    public partial class EduQuestScreen : MonoBehaviour
    {
        private VisualElement root;
        private Label status;
        private string currentScene;

        private void Start()
        {
            currentScene = gameObject.scene.name.Replace("EQ_", "");
            var document = GetComponent<UIDocument>();
            if (document == null)
            {
                Debug.LogError("EduQuest: falta UIDocument en la escena EQ_" + currentScene +
                    ". Ejecutá EduQuest > Verificar y reparar conexiones UI Toolkit.");
                return;
            }
            // Recuperación controlada si se pierde una referencia al importar Assets.
            if (document.panelSettings == null)
                document.panelSettings = Resources.Load<PanelSettings>("EduQuest/EduQuestPanel");
            if (document.visualTreeAsset == null)
                document.visualTreeAsset = Resources.Load<VisualTreeAsset>("EduQuest/Views/" + currentScene);
            if (document.panelSettings == null || document.visualTreeAsset == null)
            {
                Debug.LogError("EduQuest: falta Panel Settings o UXML para EQ_" + currentScene +
                    ". Comprobá Assets/_Project/UI/Resources/EduQuest y ejecutá el reparador de escenas.");
                return;
            }
            root = document.rootVisualElement;
            if (root == null)
            {
                Debug.LogError("EduQuest: UIDocument sin rootVisualElement en EQ_" + currentScene +
                    ". Verificá Panel Settings, UXML y errores de UI Toolkit.");
                return;
            }
            EduQuestMobileLayout.Apply(root, document.panelSettings);
            // Scroll táctil vertical sin barras visibles en TODAS las pantallas.
            // Un ScrollView para registro/historial sí es necesario en teléfonos pequeños.
            root.Query<ScrollView>().ForEach(scroll =>
            {
                scroll.mode = ScrollViewMode.Vertical;
                scroll.verticalScrollerVisibility = ScrollerVisibility.Hidden;
                scroll.horizontalScrollerVisibility = ScrollerVisibility.Hidden;
            });
            ApplyThemeArt();
            status = root.Q<Label>("status");
            if (status == null) Debug.LogWarning("EduQuest: falta Label status en " + currentScene);
            if (!EduQuestRuntime.Session.IsStudent() &&
                currentScene != "Welcome" && currentScene != "Login" && currentScene != "Register" && currentScene != "ForgotPassword")
            {
                StudentNavigation.Go("Welcome");
                return;
            }
            BindSidebar();
            switch (currentScene)
            {
                case "Welcome": SetupWelcome(); break;
                case "Login": SetupLogin(); break;
                case "ForgotPassword": SetupForgotPassword(); break;
                case "Register": SetupRegister(); break;
                case "Home": SetupHome(); break;
                case "Subjects": SetupSubjects(); break;
                case "Activities": SetupActivities(); break;
                case "Profile": SetupProfile(); break;
                case "History": SetupHistory(); break;
                case "Practice": SetupPractice(); break;
                case "Game": SetupGame(); break;
                case "Result": SetupResult(); break;
                default: Status("Vista desconocida: " + currentScene); break;
            }
        }
        private void Update()
        {
            if (root != null) EduQuestMobileLayout.Refresh(root, GetComponent<UIDocument>()?.panelSettings);
        }

        private void ApplyThemeArt()
        {
            // Imágenes reales de la identidad EduQuest, sin UI como screenshot ni
            // dependencias de iconos React. Todos los controles siguen siendo clicables.
            var screen = root.Q<VisualElement>(className: "screen");
            var backdrop = Resources.Load<Texture2D>("EduQuest/BackgroundPortrait");
            if (screen != null && backdrop != null)
            {
                screen.style.backgroundImage = new StyleBackground(backdrop);
                screen.style.unityBackgroundScaleMode = ScaleMode.ScaleAndCrop;
            }
            PaintClass("art-logo", "Logo");
            PaintClass("art-star", "AchievementStar");
            PaintClass("art-coin", "CoinIllustration");
            PaintClass("art-trophy", "TrophyIllustration");
            PaintClass("art-book", "BookIllustration");
            PaintClass("art-gamepad", "GamepadIllustration");
            PaintClass("art-bars", "ProgressIllustration");
            PaintClass("art-avatar", "Avatar");
            PaintClass("art-mail", "MailIllustration");
            PaintClass("art-menu", "MenuIllustration");
            PaintClass("art-navhome", "NavHome");
            PaintClass("art-navplay", "NavPlay");
            PaintClass("art-navsubjects", "NavSubjects");
            PaintClass("art-navhistory", "NavHistory");
            PaintClass("art-navprofile", "NavProfile");
            PaintClass("art-navlogout", "NavLogout");
            PaintClass("art-navsettings", "IconSettings");
            PaintClass("art-navhelp", "IconHelp");
            PaintClass("art-icon-mail", "IconMail");
            PaintClass("art-icon-lock", "IconLock");
            PaintClass("art-icon-eye", "IconEye");
            PaintClass("art-icon-desktop", "IconDesktop");
            PaintClass("art-icon-userplus", "IconUserPlus");
            PaintClass("art-icon-info", "IconInfo");
            PaintClass("home-tile", "GoldTile", true);
            PaintClass("primary", "GoldButton", true);
            var drawerTexture = Resources.Load<Texture2D>("EduQuest/DrawerPurple");
            var drawer = root.Q<VisualElement>(className: "sidebar");
            if (drawer != null && drawerTexture != null)
            {
                drawer.style.backgroundImage = new StyleBackground(drawerTexture);
                drawer.style.unityBackgroundScaleMode = ScaleMode.StretchToFill;
            }
        }

        // Carga tanto texturas por defecto como imagenes importadas como Sprite.
        // Devuelve false si el recurso no esta disponible o su tipo no es compatible.
        private static bool TryLoadArt(string resourceName, out StyleBackground background)
        {
            string resourcePath = "EduQuest/" + resourceName;
            var texture = Resources.Load<Texture2D>(resourcePath);
            if (texture != null)
            {
                background = new StyleBackground(texture);
                return true;
            }
            var sprite = Resources.Load<Sprite>(resourcePath);
            if (sprite != null)
            {
                background = new StyleBackground(sprite);
                return true;
            }
            background = default(StyleBackground);
            return false;
        }

        private void PaintClass(string className, string resourceName, bool stretch = false)
        {
            bool hasElements = false;
            bool triedLoad = false;
            bool resourceExists = false;
            StyleBackground background = default(StyleBackground);

            root.Query<VisualElement>(className: className).ForEach(element =>
            {
                hasElements = true;
                if (!triedLoad)
                {
                    triedLoad = true;
                    resourceExists = TryLoadArt(resourceName, out background);
                    if (!resourceExists && resourceName == "Avatar")
                        resourceExists = TryLoadArt("AvatarIllustration", out background);
                }
                if (!resourceExists) return;

                element.style.backgroundImage = background;
                element.style.unityBackgroundScaleMode = stretch ? ScaleMode.StretchToFill : ScaleMode.ScaleToFit;
                if (stretch) element.style.backgroundColor = Color.clear;
            });

            if (hasElements && !resourceExists)
                Debug.LogWarning("EduQuest: falta el recurso visual " + resourceName + " en Resources/EduQuest");
        }

        private void BindSidebar()
        {
            // Un solo controlador de drawer para TODAS las escenas, incluido Home.
            var screen = root.Q<VisualElement>(className: "screen");
            Click("home-menu", () =>
            {
                if (screen != null) screen.EnableInClassList("menu-open", !screen.ClassListContains("menu-open"));
            });
            Click("close-menu", () => screen?.RemoveFromClassList("menu-open"));
            var curtain = Q<VisualElement>("menu-backdrop");
            if (curtain != null) curtain.RegisterCallback<ClickEvent>(_ => screen?.RemoveFromClassList("menu-open"));
            Click("nav-home", () => StudentNavigation.Go("Home"));
            Click("nav-subjects", () => StudentNavigation.Go("Subjects"));
            Click("nav-practice", () => StudentNavigation.Go("Practice"));
            Click("nav-history", () => StudentNavigation.Go("History"));
            Click("nav-profile", () => StudentNavigation.Go("Profile"));
            Click("nav-settings", () => Status("Configuración estará disponible próximamente.", true));
            Click("nav-help", () => Status("Ayuda estará disponible próximamente.", true));
            Click("nav-logout", () =>
            {
                EduQuestRuntime.Session.ClearSession(); StudentNavigation.Reset(); StudentNavigation.Go("Welcome");
            });

            string activeName = currentScene switch
            {
                "Practice" => "nav-practice",
                "Subjects" => "nav-subjects",
                "Activities" => "nav-subjects",
                "History" => "nav-history",
                "Profile" => "nav-profile",
                _ => "nav-home"
            };
            foreach (var name in new[] { "nav-home", "nav-practice", "nav-subjects", "nav-history", "nav-profile", "nav-settings", "nav-help" })
            {
                var btn = root.Q<Button>(name);
                if (btn != null) btn.EnableInClassList("nav-active", name == activeName);
            }
        }
        private void Click(string name, Action callback)
        {
            var button = root.Q<Button>(name);
            if (button != null) button.clicked += callback;
        }
        private T Q<T>(string name) where T : VisualElement => root.Q<T>(name);
        private string Value(string name) => Q<TextField>(name)?.value?.Trim() ?? "";
        private void Set(string name, string value)
        {
            var field = Q<TextField>(name);
            if (field != null) field.value = value ?? "";
        }
        private void Password(string name)
        {
            var field = Q<TextField>(name);
            if (field != null) field.isPasswordField = true;
        }
        private void Status(string message, bool success = false)
        {
            if (status != null)
            {
                status.text = message ?? "";
                status.style.color = success ? new Color(0.36f, 0.96f, 0.72f) : new Color(1f, 0.76f, 0.42f);
            }
        }
        private async void Run(Func<Task> work)
        {
            Status("Cargando...");
            try { await work(); if (this != null && status != null && status.text == "Cargando...") Status(""); }
            catch (Exception ex) { if (this != null) Status(ex.Message); Debug.LogWarning("EduQuest: " + ex.Message); }
        }
        private VisualElement Items()
        {
            var box = Q<VisualElement>("items");
            if (box != null) box.Clear();
            return box;
        }
        private static Label Text(string text, string cls = "text")
        {
            var label = new Label(text ?? ""); label.AddToClassList(cls); return label;
        }
        private void Empty(VisualElement container, string message)
        {
            if (container != null) container.Add(Text(message, "muted"));
        }
        private void ListRow(VisualElement container, string title, string subtitle, string action, Action onClick)
        {
            if (container == null) return;
            var row = new VisualElement(); row.AddToClassList("list-row");
            var info = new VisualElement(); info.AddToClassList("list-info");
            info.Add(Text(title, "list-title")); info.Add(Text(subtitle, "list-subtitle"));
            row.Add(info);
            if (!string.IsNullOrWhiteSpace(action) && onClick != null)
            {
                var button = new Button(onClick) { text = action };
                button.AddToClassList("secondary"); button.AddToClassList("list-action");
                row.Add(button);
            }
            container.Add(row);
        }
        private static string FullName(UserDTO user) => user == null ? "Alumno" :
            (string.Join(" ", new[] { user.firstName, user.lastName }.Where(x => !string.IsNullOrWhiteSpace(x))));
        private static string Date(string value)
        {
            if (DateTimeOffset.TryParse(value, out var date)) return date.ToLocalTime().ToString("dd/MM/yyyy HH:mm");
            return "Sin fecha";
        }
    }
}

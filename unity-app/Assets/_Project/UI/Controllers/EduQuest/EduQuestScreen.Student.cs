using System;
using System.Linq;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.UIElements;

namespace EduQuest.Student
{
    public partial class EduQuestScreen
    {
        private ActivityDTO[] activities = Array.Empty<ActivityDTO>();
        private bool showingCompleted;
        private void SetupHome()
        {
            var screen = root.Q<VisualElement>(className: "screen");
            var homeScroll = Q<ScrollView>("home-scroll");
            if (homeScroll != null)
            {
                // Oculta el indicador; el contenido sigue desplazándose con el dedo.
                homeScroll.verticalScrollerVisibility = ScrollerVisibility.Hidden;
                homeScroll.horizontalScrollerVisibility = ScrollerVisibility.Hidden;
            }
            Click("go-practice", () => StudentNavigation.Go("Practice"));
            Click("go-subjects", () => StudentNavigation.Go("Subjects"));
            Click("go-history", () => StudentNavigation.Go("History"));
            Click("go-profile", () => StudentNavigation.Go("Profile"));
            ApplyIcon("level-icon", "LevelIcon");
            ApplyIcon("points-icon", "StarIcon");
            ApplyIcon("coins-icon", "CoinIcon");
            string studentName = FullName(EduQuestRuntime.Session.CurrentUser);
            Q<Label>("student-name").text = "¡Hola, " + studentName + "!";
            var drawerName = Q<Label>("drawer-name");
            if (drawerName != null) drawerName.text = studentName;
            var avatar = Q<VisualElement>("avatar");
            // Silueta genérica por defecto para todos los alumnos.
            // Podrá sustituirse por el avatar personalizable de Prisma más adelante.
            var texture = Resources.Load<Texture2D>("EduQuest/AvatarIllustration");
            if (texture == null) texture = Resources.Load<Texture2D>("EduQuest/Avatar");
            if (avatar != null)
            {
                if (texture != null)
                {
                    avatar.style.backgroundImage = new StyleBackground(texture);
                    avatar.style.unityBackgroundScaleMode = ScaleMode.ScaleToFit;
                }
                else
                {
                    avatar.style.backgroundColor = new Color(0.34f, 0.42f, 0.73f);
                    Debug.LogWarning("EduQuest: no se encontró GenericAvatar.png en Resources/EduQuest");
                }
            }
            Click("edit-profile", () => StudentNavigation.Go("Profile"));
            Run(async () =>
            {
                var data = await EduQuestRuntime.Student.Dashboard();
                if (this == null) return;
                Q<Label>("level").text = "Nivel " + data.level;
                var drawerLevel = Q<Label>("drawer-level");
                if (drawerLevel != null) drawerLevel.text = "Nivel " + data.level;
                var bar = Q<VisualElement>("progress-fill");
                if (bar != null)
                {
                    // Regla temporal actual del backend: un nivel por cada 500 puntos.
                    // El nivel mostrado siempre viene de Prisma, no se recalcula aquí.
                    float fraction = Mathf.Clamp01((data.points % 500) / 500f);
                    bar.style.width = Length.Percent(Mathf.Max(6f, fraction * 100f));
                }
                Q<Label>("points").text = data.points.ToString("N0");
                Q<Label>("coins").text = data.coins.ToString("N0");
                Q<Label>("progress").text = $"{data.pendingActivities} actividades pendientes  ·  {data.finishedGames} partidas completadas" +
                    (data.courses != null && data.courses.Length > 0 ? "  ·  " + string.Join(", ", data.courses.Select(x => x.name)) : "  ·  Sin curso del año actual");
            });
        }
        private void ApplyIcon(string elementName, string resourceName)
        {
            var box = Q<VisualElement>(elementName);
            var tex = Resources.Load<Texture2D>("EduQuest/" + resourceName);
            if (box != null && tex != null) box.style.backgroundImage = new StyleBackground(tex);
        }
        private void SetupSubjects()
        {
            var list = Items();
            Run(async () =>
            {
                var data = await EduQuestRuntime.Student.Subjects();
                if (this == null) return;
                if (data == null || data.Length == 0) { Empty(list, "No hay materias asignadas a tu curso actual."); return; }
                foreach (var item in data)
                {
                    var selected = item;
                    ListRow(list, item.name, "Docente: " + item.teacherName + " · Curso: " + item.courseName, "ACTIVIDADES", () =>
                    {
                        StudentNavigation.AssignmentId = selected.id;
                        StudentNavigation.SubjectName = selected.name;
                        StudentNavigation.Go("Activities");
                    });
                }
            });
        }
        private void SetupActivities()
        {
            if (StudentNavigation.AssignmentId <= 0) { StudentNavigation.Go("Subjects"); return; }
            Q<Label>("subject-name").text = StudentNavigation.SubjectName ?? "Materia";
            Click("back", () => StudentNavigation.Go("Subjects"));
            Click("pending", () => { showingCompleted = false; RenderActivities(); });
            Click("completed", () => { showingCompleted = true; RenderActivities(); });
            Run(async () =>
            {
                activities = await EduQuestRuntime.Student.Activities(StudentNavigation.AssignmentId) ?? Array.Empty<ActivityDTO>();
                if (this != null) RenderActivities();
            });
        }
        private void RenderActivities()
        {
            var list = Items();
            var selected = activities.Where(x => x.completed == showingCompleted).ToArray();
            if (selected.Length == 0) { Empty(list, showingCompleted ? "Todavía no completaste actividades." : "¡No hay actividades pendientes!"); return; }
            foreach (var item in selected)
            {
                var chosen = item;
                var details = (item.completed ? "Mejor nota: " + item.bestScore + "%" : "Hasta " + item.pointsAwarded + " puntos") +
                    " · " + item.teacherName + " · " + item.gameType;
                ListRow(list, item.title, details, item.completed ? "VOLVER A JUGAR" : "JUGAR", () =>
                {
                    if (chosen.gameType != "true_false") { Status("Este tipo de juego todavía no tiene adaptador de corrección en el servidor."); return; }
                    StudentNavigation.ActivityId = chosen.id;
                    StudentNavigation.ActivityName = chosen.title;
                    StudentNavigation.PracticeMode = false;
                    StudentNavigation.GameType = chosen.gameType;
                    StudentNavigation.Go("Game");
                });
            }
        }
        private void SetupHistory()
        {
            var list = Items();
            Run(async () =>
            {
                var data = await EduQuestRuntime.Student.History();
                if (this == null) return;
                Q<Label>("total-points").text = "★  " + data.totalPoints.ToString("N0") + " puntos totales";
                Q<Label>("history-note").text = data.estimatedHistoricalPoints
                    ? "Los puntos por partida son estimaciones históricas; el total es el saldo real." : "Puntos obtenidos por partida.";
                if (data.items == null || data.items.Length == 0) { Empty(list, "Todavía no hay partidas terminadas."); return; }
                foreach (var a in data.items)
                    ListRow(list, a.activityTitle + "  ·  " + a.score + "%",
                        a.subjectName + " · " + a.teacherName + " · " + Date(a.completedAt) +
                        " · Puntos: " + a.earnedPoints + " (estimados) · " + a.durationSeconds + " s", null, null);
            });
        }
        private void SetupProfile()
        {
            foreach (var f in new[]{"current-password", "new-password", "confirm-password"}) Password(f);
            Click("save", () => Run(async () =>
            {
                if (new[]{Value("first-name"), Value("last-name"), Value("email")}.Any(string.IsNullOrWhiteSpace))
                    throw new Exception("Nombre, apellido y correo son obligatorios.");
                var p = await EduQuestRuntime.Student.UpdateProfile(Value("first-name"), Value("last-name"), Value("email"), Value("phone"));
                if (this == null) return;
                var user = EduQuestRuntime.Session.CurrentUser;
                if (user != null) { user.firstName = p.firstName; user.lastName = p.lastName; user.email = p.email; }
                Status("Datos actualizados correctamente.", true);
            }));
            Click("password-save", () => Run(async () =>
            {
                string previous = Value("current-password"), newer = Value("new-password");
                if (string.IsNullOrWhiteSpace(previous) || newer.Length < 8) throw new Exception("Ingresá la contraseña actual y una nueva de al menos 8 caracteres.");
                if (newer != Value("confirm-password")) throw new Exception("Las contraseñas nuevas no coinciden.");
                var reply = await EduQuestRuntime.Student.ChangePassword(previous, newer);
                if (this == null) return;
                Set("current-password", ""); Set("new-password", ""); Set("confirm-password", "");
                Status(reply?.message ?? "Contraseña actualizada.", true);
            }));
            Run(async () =>
            {
                var p = await EduQuestRuntime.Student.Profile();
                if (this == null) return;
                Set("first-name", p.firstName); Set("last-name", p.lastName); Set("email", p.email); Set("phone", p.telefono);
                Q<Label>("identity-info").text = "DNI: " + p.dni + "  ·  Rol: Alumno  ·  Cuenta: " + (p.isActive ? "Activa" : "Pendiente");
            });
        }
        private void SetupPractice()
        {
            var list = Items();
            // Disponible desde el primer día: usa el nivel original, sin modificar sus assets.
            var runner = new VisualElement();
            runner.AddToClassList("featured-game");
            runner.Add(Text("AVENTURA DE MOVIMIENTO · PANTALLA HORIZONTAL", "featured-tag"));
            runner.Add(Text("Corre y aprende", "featured-title"));
            runner.Add(Text("Corré, saltá obstáculos y respondé preguntas. Por ahora usa el banco de demostración incorporado al nivel original. No afecta notas, puntos ni monedas del perfil.", "featured-detail"));
            var playRunner = new Button(() =>
            {
                if (!StudentNavigation.GoRunnerPractice())
                    Status("No se encontró el nivel del juego. Agregá Nivel01.unity a la Scene List del perfil Android.");
            }) { text = "CORRER Y RESPONDER" };
            playRunner.AddToClassList("primary");
            playRunner.AddToClassList("featured-action");
            runner.Add(playRunner);
            list.Add(runner);
            list.Add(Text("DESAFÍOS DE PREGUNTAS", "eyebrow"));
            Run(async () =>
            {
                var games = await EduQuestRuntime.Student.PracticeGames();
                if (this == null) return;
                if (games == null || games.Length == 0)
                {
                    list.Add(Text("Todavía no hay cuestionarios publicados para practicar.", "muted"));
                    return;
                }
                foreach (var game in games)
                {
                    var selected = game;
                    // No duplicar el runner cuando el servidor agregue múltiples tipos.
                    if (selected.gameType != "true_false") continue;
                    ListRow(list, "Verdadero o falso", selected.activities + " actividades de las materias publicadas · Sin nota ni puntos", "PRACTICAR", () =>
                    {
                        StudentNavigation.PracticeMode = true;
                        StudentNavigation.GameType = selected.gameType;
                        StudentNavigation.ActivityId = 0;
                        StudentNavigation.Go("Game");
                    });
                }
            });
        }
    }
}

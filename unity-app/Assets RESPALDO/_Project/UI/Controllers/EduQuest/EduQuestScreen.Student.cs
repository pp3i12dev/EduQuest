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
        private ContentTreeDTO contentTree;
        private bool showingContent = true;
        private bool showingCompleted;
        private bool historyShowHidden;
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
            // No volver a dibujar el avatar genérico en Inicio.
            // ShowSavedAvatar() pinta siempre la elección de la cuenta actual.
            var avatar = Q<VisualElement>("avatar");
            ShowSavedAvatar();
            Click("edit-profile", () => StudentNavigation.Go("Profile"));
            // Tocar la foto desde Inicio abre la selección del perfil.
            if (avatar != null) avatar.RegisterCallback<ClickEvent>(_ => StudentNavigation.Go("Profile"));
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
            var subjectLabel = Q<Label>("subject-name");
            if (subjectLabel != null) subjectLabel.text = StudentNavigation.SubjectName ?? "Materia";
            Click("back", () => StudentNavigation.Go("Subjects"));
            Click("content", () => { showingContent = true; RenderAcademicContent(); });
            Click("pending", () => { showingContent = false; showingCompleted = false; RenderAcademicContent(); });
            Click("completed", () => { showingContent = false; showingCompleted = true; RenderAcademicContent(); });
            Run(async () =>
            {
                // Ambas rutas comprueban matrícula y asignación en el backend.
                var treeTask = EduQuestRuntime.Student.ContentTree(StudentNavigation.AssignmentId);
                var activityTask = EduQuestRuntime.Student.Activities(StudentNavigation.AssignmentId);
                await Task.WhenAll(treeTask, activityTask);
                if (this == null) return;
                contentTree = treeTask.Result;
                activities = activityTask.Result ?? Array.Empty<ActivityDTO>();
                RenderAcademicContent();
            });
        }

        private void RenderAcademicContent()
        {
            UpdateAcademicTabs();
            if (showingContent) RenderContentTree();
            else RenderActivities();
        }

        private void UpdateAcademicTabs()
        {
            foreach (var name in new[] { "content", "pending", "completed" })
            {
                var button = Q<Button>(name);
                if (button == null) continue;
                bool active = name == (showingContent ? "content" : showingCompleted ? "completed" : "pending");
                button.EnableInClassList("eq-tab-active", active);
            }
        }

        private void RenderContentTree()
        {
            var list = Items();
            if (list == null) return;
            list.Add(Text("UNIDADES DIDÁCTICAS Y TEMAS", "eyebrow"));
            bool any = false;
            var referencedActivityIds = new System.Collections.Generic.HashSet<int>();
            foreach (var unit in contentTree?.units ?? Array.Empty<UnitContentDTO>())
            {
                var group = new VisualElement();
                group.AddToClassList("curriculum-unit");
                group.Add(Text("UNIDAD DIDÁCTICA", "curriculum-unit-tag"));
                group.Add(Text(unit.title, "curriculum-unit-title"));
                if (!string.IsNullOrWhiteSpace(unit.description))
                    group.Add(Text(unit.description, "curriculum-description"));

                if (unit.topics == null || unit.topics.Length == 0)
                    group.Add(Text("Todavía no se publicaron temas en esta unidad.", "muted"));
                foreach (var topic in unit.topics ?? Array.Empty<TopicContentDTO>())
                {
                    var topicBox = new VisualElement();
                    topicBox.AddToClassList("curriculum-topic");
                    topicBox.Add(Text("TEMA · " + (topic.title ?? "Sin título"), "curriculum-topic-title"));
                    if (!string.IsNullOrWhiteSpace(topic.description))
                        topicBox.Add(Text(topic.description, "curriculum-description"));

                    if (topic.materials != null && topic.materials.Length > 0)
                    {
                        topicBox.Add(Text("MATERIAL DE ESTUDIO", "curriculum-section"));
                        foreach (var material in topic.materials)
                        {
                            var selected = material;
                            ListRow(topicBox, "📘 " + material.title,
                                FriendlyFileSize(material.sizeBytes) + " · " + material.filename,
                                "DESCARGAR / ABRIR", () => Run(async () =>
                                {
                                    var bytes = await EduQuestRuntime.Student.DownloadStudyMaterial(selected.id);
                                    if (this == null) return;
                                    Status(StudyMaterialFileAccess.SaveAndOpen(selected, bytes), true);
                                }));
                        }
                        any = true;
                    }
                    if (topic.activities != null && topic.activities.Length > 0)
                    {
                        topicBox.Add(Text("JUEGOS Y ACTIVIDADES", "curriculum-section"));
                        foreach (var game in topic.activities)
                        {
                            referencedActivityIds.Add(game.id);
                            var selected = game;
                            ListRow(topicBox, "🎮 " + game.title,
                                GameTypeLabel(game.gameType) + " · Hasta " + game.pointsAwarded + " puntos",
                                "JUGAR", () => LaunchActivity(selected.id, selected.title, selected.gameType));
                        }
                        any = true;
                    }
                    if ((topic.materials == null || topic.materials.Length == 0) &&
                        (topic.activities == null || topic.activities.Length == 0))
                        topicBox.Add(Text("Todavía no hay materiales o juegos publicados en este tema.", "muted"));
                    group.Add(topicBox);
                }
                list.Add(group);
            }
            // Mantiene accesibles las actividades anteriores a la creación de Topic.
            var legacy = activities.Where(a => !referencedActivityIds.Contains(a.id)).ToArray();
            if (legacy.Length > 0)
            {
                list.Add(Text("OTRAS ACTIVIDADES PUBLICADAS", "eyebrow"));
                foreach (var game in legacy)
                {
                    var selected = game;
                    ListRow(list, game.title, GameTypeLabel(game.gameType) + " · " +
                        (game.completed ? "Completada" : "Pendiente"), "JUGAR",
                        () => LaunchActivity(selected.id, selected.title, selected.gameType));
                }
                any = true;
            }
            if (!any)
                Empty(list, "Tu docente todavía no publicó actividades ni materiales de estudio para esta materia.");
        }

        private static string FriendlyFileSize(long bytes)
        {
            if (bytes <= 0) return "Tamaño no informado";
            return bytes < 1024 * 1024 ? Math.Ceiling(bytes / 1024d) + " KB" :
                (bytes / 1048576d).ToString("0.0") + " MB";
        }

        private static string GameTypeLabel(string gameType)
        {
            switch (gameType)
            {
                case "true_false": return "Verdadero o falso";
                case "multiple_choice": return "Opciones múltiples";
                case "matching": return "Unir conceptos";
                case "sequence": return "Ordenar secuencias";
                case "classification": return "Clasificar conceptos";
                case "fill_blank": return "Completar oraciones";
                case "spot_error": return "Encontrar el error";
                case "memory": return "Memotest educativo";
                case "image_label": return "Etiquetar imagen";
                default: return gameType ?? "Juego";
            }
        }

        private void LaunchActivity(int id, string title, string type)
        {
            if (type != "true_false" && type != "multiple_choice" && type != "matching" && type != "sequence" && type != "classification" && type != "fill_blank" && type != "spot_error" && type != "memory" && type != "image_label")
            {
                Status("Este tipo de juego todavía no está disponible en Unity.");
                return;
            }
            StudentNavigation.ActivityId = id;
            StudentNavigation.ActivityName = title;
            StudentNavigation.PracticeMode = false;
            StudentNavigation.GameType = type;
            StudentNavigation.Go("Game");
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
                    " · " + item.teacherName + " · " + GameTypeLabel(item.gameType);
                ListRow(list, item.title, details, item.completed ? "VOLVER A JUGAR" : "JUGAR", () =>
                    LaunchActivity(chosen.id, chosen.title, chosen.gameType));
            }
        }
        private void SetupHistory()
        {
            var list = Items();
            if (list == null) return;
            bool includeHidden = historyShowHidden;
            var toggle = new Button(() =>
            {
                historyShowHidden = !historyShowHidden;
                SetupHistory();
            }) { text = includeHidden ? "OCULTAR RESULTADOS ARCHIVADOS" : "VER TAMBIÉN RESULTADOS OCULTOS" };
            toggle.AddToClassList("secondary");
            list.Add(toggle);
            Run(async () =>
            {
                var data = await EduQuestRuntime.Student.History(includeHidden);
                if (this == null || historyShowHidden != includeHidden) return;
                var points = Q<Label>("total-points");
                if (points != null) points.text = "★  " + data.totalPoints.ToString("N0") + " puntos totales";
                var note = Q<Label>("history-note");
                if (note != null) note.text = data.retentionPolicy ?? "Se conservan los resultados recientes.";
                if (data.items == null || data.items.Length == 0)
                {
                    Empty(list, includeHidden ? "No hay resultados registrados." : "No hay resultados visibles.");
                    return;
                }
                foreach (var item in data.items)
                {
                    var selected = item;
                    var card = new VisualElement();
                    card.AddToClassList("history-card");
                    if (item.studentHidden) card.Add(Text("OCULTO EN VERSIONES ANTERIORES", "eyebrow"));
                    card.Add(Text("ALUMNO · " + (item.studentName ?? "Alumno"), "eyebrow"));
                    card.Add(Text(item.activityTitle, "list-title"));
                    card.Add(Text("CURSO " + item.courseName + " · " + item.subjectName, "list-subtitle"));
                    card.Add(Text("UNIDAD " + item.unitName + " · TEMA " + item.topicName, "list-subtitle"));
                    card.Add(Text("Puntaje: " + item.score + "%  ·  Nota: " + item.grade.ToString("0.0") + "/10  ·  " +
                        (item.earnedPoints.HasValue ? item.earnedPoints.Value + " puntos obtenidos" : "Puntos históricos sin detalle"), "list-subtitle"));
                    card.Add(Text("Fecha y hora: " + Date(item.completedAt), "list-subtitle"));
                    var actions = new VisualElement();
                    actions.AddToClassList("history-actions");
                    var details = new VisualElement();
                    var view = new Button(() => Run(async () =>
                    {
                        details.Clear();
                        var result = await EduQuestRuntime.Student.HistoryDetail(selected.id);
                        if (this == null) return;
                        RenderAttemptReview(details, result.review);
                    })) { text = "VER RESPUESTAS" };
                    view.AddToClassList("secondary"); actions.Add(view);
                    if (item.canDelete)
                    {
                        bool confirmed = false;
                        var delete = new Button() { text = "ELIMINAR" };
                        delete.AddToClassList("danger");
                        delete.clicked += () =>
                        {
                            if (!confirmed)
                            {
                                confirmed = true;
                                delete.text = "CONFIRMAR BORRADO";
                                Status("Se borrará para siempre, también del docente. Se descontarán los puntos obtenidos. Tocá de nuevo para confirmar.");
                                return;
                            }
                            delete.SetEnabled(false);
                            Run(async () =>
                            {
                                var done = await EduQuestRuntime.Student.DeleteHistoryPermanently(selected.id);
                                if (this == null) return;
                                SetupHistory();
                                Status(done.message, true);
                            });
                        };
                        actions.Add(delete);
                    }
                    else
                    {
                        card.Add(Text(item.deleteBlockedReason ?? "Resultado protegido.", "muted"));
                    }
                    card.Add(actions); card.Add(details); list.Add(card);
                }
            });
        }
        private void SetupProfile()
        {
            SetupAvatarPicker();
            SetupAudioPreferences();
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

using System;
using System.Collections.Generic;
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
        private bool historyTabsBound;
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
            Click("go-history", () => { StudentNavigation.RankingRequested = false; StudentNavigation.Go("History"); });
            Click("go-ranking", () => { StudentNavigation.RankingRequested = true; StudentNavigation.Go("History"); });
            Click("go-profile", () => StudentNavigation.Go("Profile"));
            Click("home-settings", () => StudentNavigation.Go("Settings"));
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
                            ListRow(topicBox, material.title,
                                "Lectura · " + FriendlyFileSize(material.sizeBytes) + " · " + material.filename,
                                "ABRIR", () => Run(async () =>
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
                            bool completed = activities.Any(a => a.id == selected.id && a.completed);
                            ListRow(topicBox, game.title,
                                "Actividad · " + GameTypeLabel(game.gameType) +
                                (completed ? " · Completada · Sin nuevos puntos" : " · Hasta " + game.pointsAwarded + " puntos"),
                                completed ? "PRACTICAR" : "JUGAR",
                                () => LaunchActivity(selected.id, selected.title, selected.gameType, completed));
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
                    ListRow(list, game.title, "Actividad · " + GameTypeLabel(game.gameType) + " · " +
                        (game.completed ? "Completada · Sin nuevos puntos" : "Pendiente"), game.completed ? "PRACTICAR" : "JUGAR",
                        () => LaunchActivity(selected.id, selected.title, selected.gameType, selected.completed));
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
                default: return gameType ?? "Juego";
            }
        }

        private void LaunchActivity(int id, string title, string type, bool practiceReplay = false)
        {
            if (type != "true_false" && type != "multiple_choice" && type != "matching" && type != "sequence" && type != "classification" && type != "fill_blank" && type != "spot_error" && type != "memory")
            {
                Status("Este tipo de juego todavía no está disponible en Unity.");
                return;
            }
            StudentNavigation.ActivityId = id;
            StudentNavigation.ActivityName = title;
            StudentNavigation.PracticeMode = false;
            StudentNavigation.ActivityReplayMode = practiceReplay;
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
                var details = (item.completed ? "Nota competitiva: " + item.bestScore + "%" : "Hasta " + item.pointsAwarded + " puntos") +
                    " · " + item.teacherName + " · " + GameTypeLabel(item.gameType);
                ListRow(list, item.title, details, item.completed ? "PRACTICAR" : "JUGAR", () =>
                    LaunchActivity(chosen.id, chosen.title, chosen.gameType, chosen.completed));
            }
        }
        // Tablas móviles: ancho visible al 100 % y deslizamiento horizontal para todas las columnas.
        // La corrección completa sigue obteniéndose desde el backend tras tocar «Ver».
        private static ScrollView NewTable(VisualElement destination, string[] headers, float[] widths)
        {
            var scroll = new ScrollView(ScrollViewMode.Horizontal);
            scroll.AddToClassList("eq-data-scroll");
            // Barra visible para teclado/mouse; el gesto táctil continúa funcionando.
            scroll.horizontalScrollerVisibility = ScrollerVisibility.Auto;
            scroll.verticalScrollerVisibility = ScrollerVisibility.Hidden;
            scroll.style.width = Length.Percent(100);
            // UI Toolkit no ofrece arrastre de contenido con mouse de forma nativa
            // en todas las versiones. Se habilita sin interferir con los botones.
            AttachMouseDrag(scroll);
            var grid = new VisualElement();
            grid.AddToClassList("eq-data-table");
            float totalWidth = widths.Sum();
            grid.style.width = totalWidth;
            var header = new VisualElement();
            header.AddToClassList("eq-data-row");
            header.AddToClassList("eq-data-head");
            for (int i = 0; i < headers.Length; i++)
                header.Add(DataCell(headers[i], widths[i], "eq-data-heading"));
            grid.Add(header);
            scroll.Add(grid);
            destination.Add(scroll);
            return scroll;
        }

        private static void AttachMouseDrag(ScrollView scroll)
        {
            bool dragging = false;
            int activePointer = -1;
            float startX = 0;
            float startOffset = 0;

            scroll.RegisterCallback<PointerDownEvent>(evt =>
            {
                if (evt.pointerType != UnityEngine.UIElements.PointerType.mouse || evt.button != 0) return;
                // Los botones de cada fila deben seguir recibiendo sus clics.
                var target = evt.target as VisualElement;
                while (target != null && target != scroll)
                {
                    if (target is Button || target is Scroller) return;
                    target = target.parent;
                }
                dragging = true;
                activePointer = evt.pointerId;
                startX = evt.position.x;
                startOffset = scroll.scrollOffset.x;
                scroll.CapturePointer(activePointer);
            });
            scroll.RegisterCallback<PointerMoveEvent>(evt =>
            {
                if (!dragging || evt.pointerId != activePointer) return;
                scroll.scrollOffset = new Vector2(startOffset + startX - evt.position.x, scroll.scrollOffset.y);
            });
            scroll.RegisterCallback<PointerUpEvent>(evt =>
            {
                if (!dragging || evt.pointerId != activePointer) return;
                dragging = false;
                if (scroll.HasPointerCapture(activePointer)) scroll.ReleasePointer(activePointer);
                activePointer = -1;
            });
            scroll.RegisterCallback<PointerCaptureOutEvent>(_ => { dragging = false; activePointer = -1; });
        }

        private static VisualElement DataCell(string value, float width, string kind = "")
        {
            var cell = new VisualElement();
            cell.AddToClassList("eq-data-cell");
            cell.style.width = width;
            cell.style.minWidth = width;
            cell.style.flexShrink = 0;
            var content = Text(value ?? "—", "eq-data-text");
            if (!string.IsNullOrEmpty(kind)) content.AddToClassList(kind);
            cell.Add(content);
            return cell;
        }

        private static VisualElement DataRow(VisualElement grid, int rowIndex, bool highlight = false)
        {
            var row = new VisualElement();
            row.AddToClassList("eq-data-row");
            row.AddToClassList(rowIndex % 2 == 0 ? "eq-data-row-even" : "eq-data-row-odd");
            if (highlight) row.AddToClassList("eq-data-row-me");
            grid.Add(row);
            return row;
        }

        private static string AttemptDate(string raw, string format)
        {
            if (DateTimeOffset.TryParse(raw, out var value))
                return value.ToLocalTime().ToString(format);
            return "—";
        }

        private void SetupHistory()
        {
            var list = Items();
            if (list == null) return;
            var historyTab = Q<Button>("history-tab");
            var rankingTab = Q<Button>("ranking-tab");
            if (historyTab != null)
            {
                historyTab.EnableInClassList("eq-ranking-tab-active", !StudentNavigation.RankingRequested);
                if (!historyTabsBound) historyTab.clicked += () => { StudentNavigation.RankingRequested = false; SetupHistory(); };
            }
            if (rankingTab != null)
            {
                rankingTab.EnableInClassList("eq-ranking-tab-active", StudentNavigation.RankingRequested);
                if (!historyTabsBound) rankingTab.clicked += () => { StudentNavigation.RankingRequested = true; SetupHistory(); };
            }
            historyTabsBound = true;
            if (StudentNavigation.RankingRequested)
            {
                SetupLeaderboard(list);
                return;
            }
            var includeHidden = historyShowHidden;
            var toggle = new Button(() =>
            {
                historyShowHidden = !historyShowHidden;
                SetupHistory();
            }) { text = includeHidden ? "OCULTAR RESULTADOS ARCHIVADOS" : "VER RESULTADOS OCULTOS" };
            toggle.AddToClassList("secondary");
            toggle.AddToClassList("eq-table-toggle");
            list.Add(toggle);
            list.Add(Text("Deslizá la tabla hacia los costados para ver todas las columnas.", "eq-table-hint"));
            Run(async () =>
            {
                var data = await EduQuestRuntime.Student.History(includeHidden);
                if (this == null || historyShowHidden != includeHidden || StudentNavigation.RankingRequested) return;
                var points = Q<Label>("total-points");
                if (points != null) points.text = "Puntos totales: " + data.totalPoints.ToString("N0");
                var note = Q<Label>("history-note");
                if (note != null) note.text = data.retentionPolicy ?? "Se conservan los resultados recientes.";
                if (data.items == null || data.items.Length == 0)
                {
                    Empty(list, "Todavía no hay resultados para mostrar.");
                    return;
                }

                string[] headers = { "Alumno", "Contenido", "Unidad", "Tema", "Puntaje", "Nota", "Fecha", "Hora", "Acciones" };
                float[] widths = { 116, 170, 124, 124, 83, 74, 97, 68, 128 };
                var scroll = NewTable(list, headers, widths);
                var grid = scroll.contentContainer.Q<VisualElement>(className: "eq-data-table");
                var detail = new VisualElement();
                detail.AddToClassList("eq-table-detail");
                list.Add(detail);

                for (int index = 0; index < data.items.Length; index++)
                {
                    var item = data.items[index];
                    var chosen = item;
                    var row = DataRow(grid, index, item.studentHidden);
                    row.Add(DataCell(item.studentName ?? "Alumno", widths[0]));
                    row.Add(DataCell(item.activityTitle, widths[1], "eq-data-prominent"));
                    row.Add(DataCell(item.unitName, widths[2]));
                    row.Add(DataCell(item.topicName, widths[3]));
                    row.Add(DataCell(item.score + "%", widths[4], "eq-data-score"));
                    row.Add(DataCell(item.grade.ToString("0.0") + "/10", widths[5], "eq-data-grade"));
                    row.Add(DataCell(AttemptDate(item.completedAt, "dd/MM/yy"), widths[6]));
                    row.Add(DataCell(AttemptDate(item.completedAt, "HH:mm"), widths[7]));
                    var actions = new VisualElement();
                    actions.AddToClassList("eq-data-cell");
                    actions.AddToClassList("eq-data-actions");
                    actions.style.width = widths[8];
                    actions.style.minWidth = widths[8];
                    actions.style.flexShrink = 0;
                    var view = new Button(() => Run(async () =>
                    {
                        detail.Clear();
                        detail.Add(Text("Cargando respuestas…", "muted"));
                        var result = await EduQuestRuntime.Student.HistoryDetail(chosen.id);
                        if (this == null || StudentNavigation.RankingRequested) return;
                        detail.Clear();
                        detail.Add(Text("Revisión · " + chosen.activityTitle, "list-title"));
                        RenderAttemptReview(detail, result.review);
                    })) { text = "Ver" };
                    view.AddToClassList("eq-data-button");
                    actions.Add(view);
                    if (item.canDelete)
                    {
                        bool confirmed = false;
                        var delete = new Button() { text = "Borrar" };
                        delete.AddToClassList("eq-data-button");
                        delete.AddToClassList("eq-data-delete");
                        delete.clicked += () =>
                        {
                            if (!confirmed)
                            {
                                confirmed = true;
                                delete.text = "Confirmar";
                                Status("El resultado se eliminará también del historial docente y se descontarán los puntos. Tocá Confirmar para continuar.");
                                return;
                            }
                            delete.SetEnabled(false);
                            Run(async () =>
                            {
                                var done = await EduQuestRuntime.Student.DeleteHistoryPermanently(chosen.id);
                                if (this == null) return;
                                SetupHistory();
                                Status(done.message, true);
                            });
                        };
                        actions.Add(delete);
                    }
                    row.Add(actions);
                }
            });
        }

        private void SetupLeaderboard(VisualElement list)
        {
            var points = Q<Label>("total-points");
            if (points != null) points.text = "CLASIFICACIONES DEL CURSO";
            var note = Q<Label>("history-note");
            if (note != null) note.text = "Elegí una materia para ver el ranking general o el ranking por actividad de tu curso.";
            Run(async () =>
            {
                var data = await EduQuestRuntime.Student.Leaderboard();
                if (this == null || !StudentNavigation.RankingRequested) return;
                RenderLeaderboard(list, data);
            });
        }

        // Rankings de materias: General -> tabla; Por actividad -> listado -> tabla.
        // No se mezcla la nota de materias diferentes.
        private void RenderLeaderboard(VisualElement list, LeaderboardDTO firstData)
        {
            list.Clear();
            if (firstData == null) { Empty(list, "No se pudo cargar la clasificación."); return; }

            var subjects = firstData.subjects ?? Array.Empty<LeaderboardSubjectDTO>();
            if (subjects.Length == 0)
            {
                Empty(list, "Todavía no hay materias activas en tu curso.");
                return;
            }
            var subjectNames = subjects.Select(s => s.name ?? "Materia").ToList();
            var subjectId = firstData.assignmentId ?? subjects[0].assignmentId;
            var subjectIndex = Array.FindIndex(subjects, s => s.assignmentId == subjectId);
            if (subjectIndex < 0) { subjectIndex = 0; subjectId = subjects[0].assignmentId; }

            var filterPanel = new VisualElement();
            filterPanel.AddToClassList("eq-rank-filter-panel");
            filterPanel.Add(Text("Elegí una materia", "eq-rank-board-title"));
            filterPanel.Add(Text("Las clasificaciones se calculan dentro de tu curso y de la materia elegida.", "eq-rank-filter-caption"));
            var subjectSelect = new DropdownField("Materia", subjectNames, subjectIndex);
            subjectSelect.AddToClassList("eq-ranking-activity-select");
            filterPanel.Add(subjectSelect);

            var modeBar = new VisualElement();
            modeBar.AddToClassList("eq-rank-mode-bar");
            var generalButton = new Button { text = "GENERAL" };
            var activityButton = new Button { text = "POR ACTIVIDAD" };
            generalButton.AddToClassList("eq-rank-mode-button");
            activityButton.AddToClassList("eq-rank-mode-button");
            modeBar.Add(generalButton);
            modeBar.Add(activityButton);
            filterPanel.Add(modeBar);
            list.Add(filterPanel);

            var summary = new VisualElement();
            summary.AddToClassList("eq-rank-summary-panel");
            var summaryTitle = Text("Clasificación del curso", "eq-rank-board-title");
            summary.Add(summaryTitle);
            var badges = new VisualElement();
            badges.AddToClassList("eq-rank-chip-wrap");
            var courseBadge = Text(firstData.courseName + " · " + firstData.academicYear, "eq-rank-chip");
            var subjectBadge = Text("", "eq-rank-chip");
            var modeBadge = Text("", "eq-rank-chip");
            badges.Add(courseBadge);
            badges.Add(subjectBadge);
            badges.Add(modeBadge);
            summary.Add(badges);
            var ownPosition = Text("", "eq-rank-my-position");
            summary.Add(ownPosition);
            list.Add(summary);

            var board = new VisualElement();
            board.AddToClassList("eq-rank-board-card");
            list.Add(board);

            bool activityMode = false;
            int? chosenActivityId = null;
            LeaderboardDTO current = firstData;
            int requestSerial = 0;

            void FillHeader()
            {
                subjectBadge.text = "Materia: " + (current.subjectName ?? "Sin materia");
                modeBadge.text = activityMode ? "Por actividad" : "General";
                generalButton.EnableInClassList("eq-rank-mode-active", !activityMode);
                activityButton.EnableInClassList("eq-rank-mode-active", activityMode);
            }

            void RenderStandings(LeaderboardDTO result)
            {
                board.Clear();
                if (activityMode)
                {
                    var back = new Button { text = "Volver a actividades" };
                    back.AddToClassList("eq-rank-back-activities");
                    back.clicked += () => { chosenActivityId = null; RenderCurrent(); };
                    board.Add(back);
                    board.Add(Text(result.activityName ?? "Actividad", "eq-rank-board-title"));
                }
                else
                {
                    board.Add(Text("Promedio general · " + (result.subjectName ?? "Materia"), "eq-rank-board-title"));
                }

                // En ranking por actividad solamente aparecen quienes la completaron.
                var rows = (result.rows ?? Array.Empty<LeaderboardRowDTO>())
                    .Where(r => !activityMode || r.completedCount > 0).ToArray();
                var mine = rows.FirstOrDefault(r => r.isMe);
                ownPosition.text = mine?.position != null ? "Tu puesto: #" + mine.position.Value :
                    (activityMode ? "Todavía no participaste en esta actividad." : "Todavía no tenés una posición registrada.");
                if (rows.Length == 0)
                {
                    Empty(board, activityMode ? "Esta actividad todavía no tiene alumnos que la hayan completado." : "Todavía no hay resultados en esta materia.");
                    return;
                }

                var header = new VisualElement();
                header.AddToClassList("eq-rank-line");
                header.AddToClassList("eq-rank-line-head");
                var posHead = Text("#", "eq-rank-head-label"); posHead.style.width = 42;
                var nameHead = Text("ALUMNO", "eq-rank-head-label"); nameHead.AddToClassList("eq-rank-name-column");
                var pointsHead = Text("PTS", "eq-rank-head-label"); pointsHead.style.width = 54;
                var gradeHead = Text("NOTA", "eq-rank-head-label"); gradeHead.style.width = 48;
                header.Add(posHead); header.Add(nameHead); header.Add(pointsHead); header.Add(gradeHead);
                board.Add(header);

                for (int i = 0; i < rows.Length; i++)
                {
                    var entry = rows[i];
                    var row = new VisualElement();
                    row.AddToClassList("eq-rank-line");
                    row.AddToClassList(i % 2 == 0 ? "eq-rank-line-even" : "eq-rank-line-odd");
                    if (entry.isMe) row.AddToClassList("eq-rank-line-self");
                    if (entry.position == 1) row.AddToClassList("eq-rank-line-first");
                    else if (entry.position == 2) row.AddToClassList("eq-rank-line-second");
                    else if (entry.position == 3) row.AddToClassList("eq-rank-line-third");
                    var medal = new VisualElement(); medal.AddToClassList("eq-rank-star");
                    var star = Resources.Load<Texture2D>("EduQuest/AchievementStar");
                    if (star != null) medal.style.backgroundImage = new StyleBackground(star);
                    var num = Text(entry.position?.ToString() ?? "—", "eq-rank-star-number");
                    medal.Add(num); row.Add(medal);
                    var person = new VisualElement(); person.AddToClassList("eq-rank-name-column");
                    person.Add(Text((entry.name ?? "Alumno") + (entry.isMe ? " (yo)" : ""), "eq-rank-name"));
                    if (!activityMode) person.Add(Text(entry.completedCount + "/" + entry.totalActivities + " actividades", "eq-rank-caption"));
                    row.Add(person);
                    row.Add(Text(entry.points.ToString("0"), "eq-rank-points"));
                    row.Add(Text(entry.grade.ToString("0.0"), "eq-rank-grade"));
                    board.Add(row);
                }
                var footnote = Text(activityMode
                    ? "Se muestra el mejor resultado de los alumnos que completaron esta actividad. Los empates comparten puesto."
                    : "General de la materia: mejor resultado por actividad; las pendientes cuentan como 0 para el promedio.", "eq-rank-footnote");
                board.Add(footnote);
            }

            void RenderCurrent()
            {
                FillHeader();
                if (activityMode && !chosenActivityId.HasValue)
                {
                    board.Clear();
                    ownPosition.text = "Seleccioná una actividad para ver sus posiciones.";
                    board.Add(Text("Actividades de " + (current.subjectName ?? "la materia"), "eq-rank-board-title"));
                    var choices = current.activities ?? Array.Empty<LeaderboardActivityDTO>();
                    if (choices.Length == 0)
                    {
                        Empty(board, "Esta materia todavía no tiene actividades publicadas.");
                        return;
                    }
                    foreach (var item in choices)
                    {
                        var chosen = item;
                        var card = new Button(() =>
                        {
                            chosenActivityId = chosen.id;
                            Load(subjectId, chosenActivityId);
                        });
                        card.AddToClassList("eq-rank-activity-card");
                        var icon = new VisualElement(); icon.AddToClassList("eq-rank-activity-check");
                        var art = Resources.Load<Texture2D>("EduQuest/GamepadIllustration");
                        if (art != null) icon.style.backgroundImage = new StyleBackground(art);
                        var info = new VisualElement(); info.AddToClassList("eq-rank-activity-info");
                        info.Add(Text(chosen.title ?? "Actividad", "eq-rank-activity-title"));
                        info.Add(Text("Ver posiciones de quienes completaron el juego", "eq-rank-activity-subtitle"));
                        var action = Text("VER", "eq-rank-activity-open");
                        card.Add(icon); card.Add(info); card.Add(action);
                        board.Add(card);
                    }
                    return;
                }
                RenderStandings(current);
            }

            void Load(int assignmentId, int? activityId)
            {
                int ownSerial = ++requestSerial;
                board.Clear();
                board.Add(Text("Cargando clasificación...", "muted"));
                Run(async () =>
                {
                    var response = await EduQuestRuntime.Student.Leaderboard(assignmentId, activityId);
                    if (this == null || !StudentNavigation.RankingRequested || ownSerial != requestSerial ||
                        subjectId != assignmentId || chosenActivityId != activityId) return;
                    current = response;
                    RenderCurrent();
                });
            }

            generalButton.clicked += () =>
            {
                ++requestSerial;
                activityMode = false;
                chosenActivityId = null;
                if (current.assignmentId == subjectId && current.activityId == null) RenderCurrent();
                else Load(subjectId, null);
            };
            activityButton.clicked += () =>
            {
                ++requestSerial;
                activityMode = true;
                chosenActivityId = null;
                if (current.assignmentId == subjectId) RenderCurrent();
                else Load(subjectId, null);
            };
            subjectSelect.RegisterValueChangedCallback(evt =>
            {
                int idx = subjectNames.IndexOf(evt.newValue);
                if (idx < 0 || idx >= subjects.Length) return;
                subjectId = subjects[idx].assignmentId;
                chosenActivityId = null;
                Load(subjectId, null);
            });
            RenderCurrent();
        }

        private void SetupProfile()
        {
            SetupAvatarPicker();
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

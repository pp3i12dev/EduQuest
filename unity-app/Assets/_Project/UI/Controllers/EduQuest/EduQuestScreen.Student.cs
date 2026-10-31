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
            Q<Label>("student-name").text = FullName(EduQuestRuntime.Session.CurrentUser);
            var avatar = Q<VisualElement>("avatar");
            var texture = Resources.Load<Texture2D>("EduQuest/Avatar");
            if (texture != null && avatar != null) avatar.style.backgroundImage = new StyleBackground(texture);
            Click("edit-profile", () => StudentNavigation.Go("Profile"));
            Run(async () =>
            {
                var data = await EduQuestRuntime.Student.Dashboard();
                if (this == null) return;
                Q<Label>("level").text = data.level.ToString();
                Q<Label>("points").text = data.points.ToString("N0");
                Q<Label>("coins").text = data.coins.ToString("N0");
                Q<Label>("progress").text = $"{data.pendingActivities} actividades pendientes  ·  {data.finishedGames} partidas completadas" +
                    (data.courses != null && data.courses.Length > 0 ? "  ·  " + string.Join(", ", data.courses.Select(x => x.name)) : "  ·  Sin curso del año actual");
            });
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
            Run(async () =>
            {
                var games = await EduQuestRuntime.Student.PracticeGames();
                if (this == null) return;
                if (games == null || games.Length == 0) { Empty(list, "Todavía no hay juegos disponibles para practicar."); return; }
                foreach (var game in games)
                {
                    var selected = game;
                    ListRow(list, game.name, game.activities + " actividades disponibles · Sin nota ni puntos", "PRACTICAR", () =>
                    {
                        if (selected.gameType != "true_false") { Status("Aún falta el adaptador para este juego."); return; }
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

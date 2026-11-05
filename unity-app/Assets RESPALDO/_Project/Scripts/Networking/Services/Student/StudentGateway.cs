using System.Threading.Tasks;

namespace EduQuest.Student
{
    // Una única fachada del cliente; todas las rutas son las declaradas en student.routes.js.
    public class StudentGateway
    {
        private readonly ApiClient api;
        public StudentGateway(ApiClient api) { this.api = api; }
        public Task<DashboardDTO> Dashboard() => api.GetAsync<DashboardDTO>("/student/dashboard");
        public Task<SubjectDTO[]> Subjects() => api.GetAsync<SubjectDTO[]>("/student/subjects");
        public Task<ActivityDTO[]> Activities(int assignmentId) => api.GetAsync<ActivityDTO[]>("/student/subjects/" + assignmentId + "/activities");
        // GET con JWT: el servidor valida la inscripción antes de devolver el árbol.
        public Task<ContentTreeDTO> ContentTree(int assignmentId) =>
            api.GetAsync<ContentTreeDTO>("/student/subjects/" + assignmentId + "/content");
        // Nunca abrir downloadPath en navegador sin JWT: se descarga por la API autorizada.
        public Task<byte[]> DownloadStudyMaterial(int materialId) =>
            api.GetBytesAsync("/student/materials/" + materialId + "/file");
        public Task<LeaderboardDTO> Leaderboard(int? activityId = null) =>
            api.GetAsync<LeaderboardDTO>("/student/leaderboard" +
                (activityId.HasValue ? "?activityId=" + activityId.Value : ""));
        public Task<HistoryDTO> History(bool includeHidden = false) =>
            api.GetAsync<HistoryDTO>("/student/history" + (includeHidden ? "?includeHidden=true" : ""));
        public Task<AttemptDetailDTO> HistoryDetail(int attemptId) => api.GetAsync<AttemptDetailDTO>("/student/history/" + attemptId);
        // Oculta de la vista del alumno; la evidencia académica continúa en PostgreSQL.
        public Task<MessageDTO> HideHistory(int attemptId) => api.Request<MessageDTO>("DELETE", "/student/history/" + attemptId);
        // Operación DESTRUCTIVA nueva; confirmación explícita, autorización y reglas en el servidor.
        public Task<DeleteHistoryDTO> DeleteHistoryPermanently(int attemptId) =>
            api.Request<DeleteHistoryDTO>("DELETE", "/student/history/" + attemptId + "/permanent", new { confirm = "BORRAR" });
        public Task<AvatarDTO> Avatar() => api.GetAsync<AvatarDTO>("/student/avatar");
        public Task<AvatarDTO> UpdateAvatar(string avatarId) =>
            api.PatchAsync<object, AvatarDTO>("/student/avatar", new { avatarId });
        public Task<ProfileDTO> Profile() => api.GetAsync<ProfileDTO>("/users/me");
        public Task<ProfileDTO> UpdateProfile(string firstName, string lastName, string email, string phone) =>
            api.PatchAsync<object, ProfileDTO>("/users/me", new { firstName, lastName, email, telefono = phone });
        public Task<MessageDTO> ChangePassword(string oldPassword, string newPassword) =>
            api.PatchAsync<object, MessageDTO>("/users/me/password", new { currentPassword = oldPassword, newPassword, confirmPassword = newPassword });
        public Task<QuestionSetDTO> Play(int activityId) => api.GetAsync<QuestionSetDTO>("/student/activities/" + activityId + "/play");
        public Task<ResultDTO> Complete(int activityId, AnswerDTO[] answers, int durationSeconds) =>
            api.PostAsync<object, ResultDTO>("/student/activities/" + activityId + "/complete", new { answers, timeInSec = durationSeconds });

        public Task<GameTypeDTO[]> PracticeGames() => api.GetAsync<GameTypeDTO[]>("/student/practice/games");
        public Task<QuestionSetDTO> PracticeQuestions(string type) => api.GetAsync<QuestionSetDTO>("/student/practice/questions?gameType=" + System.Uri.EscapeDataString(type));
        public Task<ResultDTO> CheckPractice(string type, AnswerDTO[] answers) =>
            api.PostAsync<object, ResultDTO>("/student/practice/check", new { gameType = type, answers });
    }
}

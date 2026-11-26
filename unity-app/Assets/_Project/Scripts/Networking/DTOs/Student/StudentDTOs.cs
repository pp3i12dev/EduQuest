using System;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace EduQuest.Student
{
    [Serializable] public class DashboardDTO { public int points, level, coins, finishedGames, pendingActivities; public CourseInfoDTO[] courses; public string progressRule; }
    [Serializable] public class CourseInfoDTO { public int id, year; public string name, shift; }
    [Serializable] public class SubjectDTO { public int id, subjectId, courseId; public string name, teacherName, courseName; }
    [Serializable] public class ActivityDTO { public int id, pointsAwarded; public string title, description, gameType, teacherName, subjectName, createdAt; public bool completed; [JsonProperty("bestScore")] public int? bestScore { get; set; } }
    [Serializable] public class HistoryDTO
    {
        public int totalPoints;
        public bool estimatedHistoricalPoints;
        public string retentionPolicy;
        public AttemptDTO[] items;
    }
    [Serializable] public class AttemptDTO
    {
        public int id, score, durationSeconds;
        public float grade;
        public bool canHide, canDelete, studentHidden, reviewAvailable;
        public string deleteBlockedReason;
        [JsonProperty("earnedPoints")] public int? earnedPoints { get; set; }
        public string studentName, activityTitle, subjectName, courseName, unitName, topicName, completedAt;
    }
    [Serializable] public class ReviewAnswerDTO
    {
        public string id, text, explanation;
        // Propiedades JSON: Unity no intenta serializar JToken como campo de escena.
        // Newtonsoft.Json sigue convirtiendo los valores booleanos o las opciones.
        [JsonProperty("givenAnswer")]
        public JToken givenAnswer { get; set; }
        [JsonProperty("correctAnswer")]
        public JToken correctAnswer { get; set; }
        public bool isCorrect;
        public RemoteChoiceDTO[] options;
    }
    [Serializable] public class AttemptDetailDTO : AttemptDTO
    {
        public ReviewAnswerDTO[] review;
    }
    [Serializable] public class LeaderboardDTO
    {
        public int courseId, academicYear, totalActivities;
        public string courseName, subjectName, mode, activityName, policy;
        [JsonProperty("assignmentId")] public int? assignmentId { get; set; }
        [JsonProperty("activityId")] public int? activityId { get; set; }
        [JsonProperty("myPosition")] public int? myPosition { get; set; }
        public LeaderboardSubjectDTO[] subjects;
        public LeaderboardActivityDTO[] activities;
        public LeaderboardRowDTO[] rows;
    }
    [Serializable] public class LeaderboardSubjectDTO { public int assignmentId; public string name; }
    [Serializable] public class LeaderboardActivityDTO { public int id; public string title; }
    [Serializable] public class LeaderboardRowDTO
    {
        [JsonProperty("studentId")] public int? studentId { get; set; }
        [JsonProperty("position")] public int? position { get; set; }
        public string name;
        public float score, grade, points;
        public int completedCount, totalActivities, coverage;
        public bool isMe;
    }
    [Serializable] public class AvatarDTO { public string avatarId; }
    [Serializable] public class ProfileDTO { public int id; public string dni, firstName, lastName, email, telefono; public bool isActive; public string[] roles; }
    [Serializable] public class GameTypeDTO { public string gameType, name; public int activities; }
    // Para 'matching', questions[] contiene conceptos a la izquierda y options[]
    // contiene las mismas definiciones desordenadas, identificadas por tokens opacos.
    // correctAnswer JAMÁS aparece en esta respuesta.
    [Serializable] public class QuestionDTO { public string id, text; public float x, y; public RemoteChoiceDTO[] options; }
    [Serializable] public class QuestionSetDTO { public int id; public string title, description, gameType; public QuestionDTO[] questions; }
    [Serializable] public class AnswerDTO { public string id; public bool answer; public string optionId; }
    [Serializable] public class ResultDTO
    {
        public int score, correct, total, earnedPoints, attemptId, points, level, coins;
        public float grade;
        public bool practiceOnly;
        public string message;
        public ReviewAnswerDTO[] review;
    }
    // Entrega 3: árbol académico autorizado por curso/materia.
    // Contrato de GET /api/student/subjects/{assignmentId}/content.
    [Serializable] public class ContentTreeDTO
    {
        public int teacherSubjectId, courseId;
        public string subjectName;
        public UnitContentDTO[] units;
    }
    [Serializable] public class UnitContentDTO
    {
        public int id;
        public string title, description;
        public TopicContentDTO[] topics;
    }
    [Serializable] public class TopicContentDTO
    {
        public int id;
        public string title, description;
        public StudyMaterialDTO[] materials;
        public TopicActivityDTO[] activities;
    }
    [Serializable] public class TopicActivityDTO
    {
        public int id, pointsAwarded;
        public string title, gameType;
    }
    [Serializable] public class StudyMaterialDTO
    {
        public int id;
        public string title, filename, mimeType, downloadPath;
        public long sizeBytes;
    }
    [Serializable] public class MessageDTO { public string message; }
    [Serializable] public class DeleteHistoryDTO
    {
        public bool deleted;
        public int attemptId, pointsReversed, pointsRemaining;
        public string message;
    }
    [Serializable] public class AssessmentDTO { public AnswerDTO[] answers; public int timeInSec; }
    [Serializable] public class PracticeCheckDTO { public string gameType; public AnswerDTO[] answers; }
    // Para próximos juegos: no enviar las soluciones al cliente durante una evaluación.
    [Serializable] public class RemoteChoiceDTO { public string id, text; }
    [Serializable] public class RemoteMultiQuestionDTO { public string id, text; public RemoteChoiceDTO[] options; }
    [Serializable] public class RemoteMatchingQuestionDTO { public string id, prompt; public RemoteChoiceDTO[] left, right; }
}


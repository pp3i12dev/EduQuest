using System;

namespace EduQuest.Student
{
    [Serializable] public class DashboardDTO { public int points, level, coins, finishedGames, pendingActivities; public CourseInfoDTO[] courses; public string progressRule; }
    [Serializable] public class CourseInfoDTO { public int id, year; public string name; }
    [Serializable] public class SubjectDTO { public int id, subjectId, courseId; public string name, teacherName, courseName; }
    [Serializable] public class ActivityDTO { public int id, pointsAwarded; public string title, description, gameType, teacherName, subjectName, createdAt; public bool completed; public int? bestScore; }
    [Serializable] public class HistoryDTO { public int totalPoints; public bool estimatedHistoricalPoints; public AttemptDTO[] items; }
    [Serializable] public class AttemptDTO { public int id, score, earnedPoints, durationSeconds; public string activityTitle, subjectName, teacherName, activityDate, completedAt; }
    [Serializable] public class ProfileDTO { public int id; public string dni, firstName, lastName, email, telefono; public bool isActive; public string[] roles; }
    [Serializable] public class GameTypeDTO { public string gameType, name; public int activities; }
    [Serializable] public class QuestionDTO { public string id, text; }
    [Serializable] public class QuestionSetDTO { public int id; public string title, description, gameType; public QuestionDTO[] questions; }
    [Serializable] public class AnswerDTO { public string id; public bool answer; }
    [Serializable] public class ResultDTO { public int score, correct, total, earnedPoints, attemptId, points, level, coins; public string message; }
    [Serializable] public class MessageDTO { public string message; }
    [Serializable] public class AssessmentDTO { public AnswerDTO[] answers; public int timeInSec; }
    [Serializable] public class PracticeCheckDTO { public string gameType; public AnswerDTO[] answers; }
    // Para próximos juegos: no enviar las soluciones al cliente durante una evaluación.
    [Serializable] public class RemoteChoiceDTO { public string id, text; }
    [Serializable] public class RemoteMultiQuestionDTO { public string id, text; public RemoteChoiceDTO[] options; }
    [Serializable] public class RemoteMatchingQuestionDTO { public string id, prompt; public RemoteChoiceDTO[] left, right; }
}

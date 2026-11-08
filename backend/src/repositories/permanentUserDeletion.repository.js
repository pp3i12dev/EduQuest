// Borrado irreversible y explícito de una cuenta y sus relaciones propias.
// NO agrega onDelete: Cascade a tablas pedagógicas: solo se ejecuta cuando
// una autoridad competente confirma «ELIMINAR TODO».
// Todo se resuelve en UNA transacción; una FK inesperada revierte el conjunto.
// Atención: las actividades de un docente dependen de él: al borrar al docente
// se borran sus actividades y también los GameAttempt de alumnos que las usaron.
import { getPrisma } from '../config/prisma.js';

const conflict = message => Object.assign(new Error(message), { status: 409 });
const idsOf = items => items.map(item => item.id);

export async function permanentlyDeleteUserAndRelations({ id, institutionId }) {
  const db = getPrisma();
  return db.$transaction(async tx => {
    const user = await tx.user.findFirst({
      where: { id, deletedAt: null, ...(institutionId == null ? {} : { institutionId }) },
      select: {
        id: true, isSuperAdmin: true,
        teacherProfile: { select: { id: true } },
        studentProfile: { select: { id: true } },
        preceptorProfile: { select: { id: true } },
      },
    });
    if (!user || user.isSuperAdmin)
      throw conflict('Usuario inexistente, fuera de la institución o protegido.');

    const teacherId = user.teacherProfile?.id;
    const studentId = user.studentProfile?.id;
    const preceptorId = user.preceptorProfile?.id;
    const assignments = teacherId
      ? idsOf(await tx.teacherSubject.findMany({ where: { teacherId }, select: { id: true } }))
      : [];
    const activities = teacherId
      ? idsOf(await tx.activity.findMany({ where: { teacherId }, select: { id: true } }))
      : [];

    // Las referencias obligatorias a User o TeacherSubject requieren eliminar
    // el aviso completo. Si el usuario solo lo editó/confirmó, se desasocia.
    const noticesToDelete = idsOf(await tx.earlyNotice.findMany({
      where: { OR: [
        { createdById: id }, { teacherUserId: id },
        ...(assignments.length ? [{ teacherSubjectId: { in: assignments } }] : []),
      ] }, select: { id: true },
    }));
    if (noticesToDelete.length)
      await tx.earlyNotice.deleteMany({ where: { id: { in: noticesToDelete } } });
    await tx.earlyNotice.updateMany({
      where: { OR: [{ updatedById: id }, { confirmedById: id }] },
      data: { updatedById: null, confirmedById: null },
    });
    // Una revisión obligatoriamente atribuida a la cuenta también se retira.
    await tx.earlyNoticeRevision.deleteMany({ where: { createdById: id } });
    if (assignments.length)
      await tx.earlyNoticeClass.deleteMany({ where: { teacherSubjectId: { in: assignments } } });

    // Eventos creados por el usuario: propios. Eventos ajenos que solo editó:
    // conservarlos y anular el vínculo opcional para no borrar datos de terceros.
    await tx.institutionEvent.deleteMany({ where: { createdById: id } });
    await tx.institutionEvent.updateMany({ where: { updatedById: id }, data: { updatedById: null } });
    await tx.institutionEventRevision.deleteMany({ where: { createdById: id } });
    await tx.invitation.deleteMany({ where: { invitedById: id } });

    // Historial de asistencia registrado por el preceptor / propio del alumno.
    if (studentId || preceptorId)
      await tx.attendance.deleteMany({ where: { OR: [
        ...(studentId ? [{ studentId }] : []),
        ...(preceptorId ? [{ preceptorId }] : []),
      ] } });

    // Conciliación de recompensas antes de eliminar una actividad docente.
    // Los puntos se acumulan en StudentProfile y NO se recalculan solos por FK.
    // Impedir una operación destructiva si faltan puntos históricos verificables.
    if (activities.length) {
      const attemptScope = {
        activityId: { in: activities },
        ...(studentId ? { studentId: { not: studentId } } : {}),
      };
      const legacy = await tx.gameAttempt.count({
        where: { ...attemptScope, earnedPoints: null },
      });
      if (legacy) throw conflict(
        'Hay intentos históricos sin desglose de puntos; no se pueden conciliar saldos de otros alumnos. Primero realizá una conciliación de pruebas'
      );
      const pointsByStudent = await tx.gameAttempt.groupBy({
        by: ['studentId'], where: attemptScope, _sum: { earnedPoints: true },
      });
      for (const row of pointsByStudent) {
        const awarded = Number(row._sum.earnedPoints || 0);
        if (!awarded) continue;
        const student = await tx.studentProfile.findUnique({
          where: { id: row.studentId }, select: { puntosTotales: true },
        });
        if (!student || student.puntosTotales < awarded) {
          throw conflict('El saldo de puntos de otro alumno es inconsistente; se canceló todo el borrado');
        }
        const points = student.puntosTotales - awarded;
        await tx.studentProfile.update({
          where: { id: row.studentId },
          data: { puntosTotales: points, nivelActual: Math.floor(points / 500) + 1 },
        });
      }
    }

    // Intentos: los del alumno, y los de las actividades propias del docente.
    // Importante: esto también borra los resultados de otros alumnos de esas
    // actividades. Se explica expresamente en la confirmación de la interfaz.
    const attemptsWhere = [
      ...(studentId ? [{ studentId }] : []),
      ...(activities.length ? [{ activityId: { in: activities } }] : []),
    ];
    if (attemptsWhere.length) await tx.gameAttempt.deleteMany({ where: { OR: attemptsWhere } });
    if (activities.length) await tx.activity.deleteMany({ where: { id: { in: activities } } });

    if (studentId) {
      await tx.studentInventory.deleteMany({ where: { studentId } });
      await tx.avatarConfig.deleteMany({ where: { studentId } });
      await tx.studentCourse.deleteMany({ where: { studentId } });
    }

    // Dependencias didácticas de las asignaciones del docente. No se borran
    // Course ni Subject ni los materiales de otros docentes.
    if (assignments.length) {
      const units = idsOf(await tx.unit.findMany({
        where: { teacherSubjectId: { in: assignments } }, select: { id: true },
      }));
      const topics = units.length ? idsOf(await tx.topic.findMany({
        where: { unitId: { in: units } }, select: { id: true },
      })) : [];
      await tx.studyMaterial.deleteMany({ where: { OR: [
        { teacherSubjectId: { in: assignments } },
        ...(topics.length ? [{ topicId: { in: topics } }] : []),
      ] } });
      if (topics.length) {
        // Activity.topicId es nullable: preservar actividades de otro docente.
        await tx.activity.updateMany({ where: { topicId: { in: topics } }, data: { topicId: null } });
        await tx.topic.deleteMany({ where: { id: { in: topics } } });
      }
      // UnitActivity y TeacherSubjectContent tienen cascadas explícitas ya
      // definidas en el esquema; no se cambia el contrato académico.
      if (units.length) await tx.unit.deleteMany({ where: { id: { in: units } } });
      await tx.teacherSubjectContent.deleteMany({ where: { teacherSubjectId: { in: assignments } } });
      await tx.teacherSubject.deleteMany({ where: { id: { in: assignments } } });
    }

    // Notificaciones/tokens/push/perfiles son FK con ON DELETE CASCADE.
    // De todos modos se elimina el destinatario y sus suscripciones explícitamente.
    await tx.refreshToken.deleteMany({ where: { userId: id } });
    await tx.webPushSubscription.deleteMany({ where: { userId: id } });
    await tx.userDevice.deleteMany({ where: { userId: id } });
    const deleted = await tx.user.deleteMany({
      where: { id, deletedAt: null, ...(institutionId == null ? {} : { institutionId }) },
    });
    if (deleted.count !== 1) throw conflict('La cuenta cambió durante el borrado: se revirtió la transacción.');
    return { deleted: true, removedActivities: activities.length };
  }, { timeout: 60000, maxWait: 10000 });
}

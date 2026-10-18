
import {
    createValidationError,
} from './accessControl.js';

export const SCHEDULE_DAYS = Object.freeze([
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
]);

export const SCHEDULE_SHIFTS = Object.freeze([
    'MANANA',
    'TARDE',
    'NOCHE',
]);

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateTime(value, fieldName) {
    if (
        typeof value !== 'string' ||
        !TIME_PATTERN.test(value)
    ) {
        throw createValidationError(
            `${fieldName} debe tener formato HH:mm.`
        );
    }

    return value;
}

export function validateScheduleSlot(slot) {
    if (!slot || typeof slot !== 'object') {
        throw createValidationError(
            'Los datos del horario son obligatorios.'
        );
    }

    const {
        day,
        shift,
        startTime,
        endTime,
    } = slot;

    if (!SCHEDULE_DAYS.includes(day)) {
        throw createValidationError(
            'El día de la semana no es válido.'
        );
    }

    if (!SCHEDULE_SHIFTS.includes(shift)) {
        throw createValidationError(
            'El turno seleccionado no es válido.'
        );
    }

    validateTime(startTime, 'La hora de inicio');
    validateTime(endTime, 'La hora de finalización');

    if (startTime >= endTime) {
        throw createValidationError(
            'La hora de finalización debe ser posterior a la de inicio.'
        );
    }

    return {
        day,
        shift,
        startTime,
        endTime,
    };
}

export function validateScheduleSlots(slots) {
    if (!Array.isArray(slots)) {
        throw createValidationError(
            'Los horarios deben enviarse como una lista.'
        );
    }

    const validated = slots.map(validateScheduleSlot);
    const uniqueSlots = new Set();

    for (const slot of validated) {
        const key = [
            slot.day,
            slot.shift,
            slot.startTime,
            slot.endTime,
        ].join(':');

        if (uniqueSlots.has(key)) {
            throw createValidationError(
                'Hay horarios duplicados para la materia.'
            );
        }

        uniqueSlots.add(key);
    }

    for (let i = 0; i < validated.length; i += 1) {
        for (
            let j = i + 1;
            j < validated.length;
            j += 1
        ) {
            const first = validated[i];
            const second = validated[j];

            const sameDay = first.day === second.day;

            const overlaps =
                first.startTime < second.endTime &&
                second.startTime < first.endTime;

            if (sameDay && overlaps) {
                throw createValidationError(
                    'La materia tiene horarios superpuestos en el mismo día.'
                );
            }
        }
    }

    return validated;
}

export function validateClassDate(value) {
    if (
        typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        throw createValidationError(
            'La fecha debe tener formato AAAA-MM-DD.'
        );
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
    ) {
        throw createValidationError(
            'La fecha seleccionada no existe.'
        );
    }

    return date;
}

export function getScheduleDayFromDate(value) {
    const date =
        value instanceof Date
            ? value
            : validateClassDate(value);

    const days = [
        null,
        'LUNES',
        'MARTES',
        'MIERCOLES',
        'JUEVES',
        'VIERNES',
        'SABADO',
    ];

    const day = days[date.getUTCDay()];

    if (!day) {
        throw createValidationError(
            'No se admiten clases programadas los domingos.'
        );
    }

    return day;
}

export function validateNoticeSchedule({
    classDate,
    schedule,
}) {
    const date = validateClassDate(classDate);
    const slot = validateScheduleSlot(schedule);

    const expectedDay = getScheduleDayFromDate(date);

    if (slot.day !== expectedDay) {
        throw createValidationError(
            'La fecha del aviso no coincide con el día del horario seleccionado.'
        );
    }

    return {
        classDate: date,
        ...slot,
    };
}

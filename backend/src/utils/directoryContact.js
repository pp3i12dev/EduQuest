// Solo valores destinados al directorio. No alterar email/telefono de autenticación.
function invalid(message) { throw Object.assign(new Error(message), { status: 400 }); }

export function effectiveDirectoryContact(user = {}) {
  // null/undefined corresponde a una cuenta anterior a la migración.
  // Cadena vacía significa que el propietario borró el dato explícitamente.
  return {
    email: user.directoryContactEmail == null ? (user.email ?? '') : user.directoryContactEmail,
    phone: user.directoryContactPhone == null ? (user.telefono ?? '') : user.directoryContactPhone,
  };
}

export function normalizeDirectoryEmail(value) {
  if (typeof value !== 'string') invalid('El correo de contacto debe ser texto.');
  const email = value.trim().toLowerCase();
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    invalid('Ingresá un correo electrónico de contacto válido.');
  }
  return email;
}

export function normalizeDirectoryPhone(value) {
  if (typeof value !== 'string') invalid('El teléfono de contacto debe ser texto.');
  const phone = value.trim().replace(/\s+/g, ' ');
  const digits = phone.replace(/\D/g, '');
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || phone.length > 35 || digits.length < 7 || digits.length > 15)) {
    invalid('Ingresá un teléfono de contacto válido (7 a 15 dígitos).');
  }
  return phone;
}

export function sharedDirectoryContact(user, viewerRoles = []) {
  const effective = effectiveDirectoryContact(user);
  const allows = roles => Array.isArray(roles) &&
    viewerRoles.some(role => roles.includes(role));
  return {
    email: allows(user.directoryEmailRoles) ? (effective.email || null) : null,
    telefono: allows(user.directoryPhoneRoles) ? (effective.phone || null) : null,
  };
}


/**
 * Restringe el directorio a personas con al menos un contacto compartido
 * expresamente con alguno de los roles del visitante. Se aplica en Prisma
 * ANTES de count/skip/take: no revela presencia ni altera la paginación.
 *
 * Los campos NULL corresponden a cuentas antiguas y usan su dato de registro;
 * una cadena vacía significa que el titular borró el dato a propósito.
 * IMPORTANTE: ni siquiera SUPER_ADMIN puede ignorar estos permisos.
 */
export function visibleDirectoryContactWhere(viewerRoles = []) {
  const allowedRoles = ['SUPER_ADMIN', 'DIRECTOR', 'PRECEPTOR', 'TEACHER', 'STUDENT'];
  const roles = [...new Set((Array.isArray(viewerRoles) ? viewerRoles : [])
    .filter(role => allowedRoles.includes(role)))];
  if (!roles.length) return { id: { in: [] } };
  return {
    OR: [
      {
        directoryEmailRoles: { hasSome: roles },
        OR: [
          { directoryContactEmail: { notIn: [''] } },
          { directoryContactEmail: null, email: { not: '' } },
        ],
      },
      {
        directoryPhoneRoles: { hasSome: roles },
        OR: [
          { directoryContactPhone: { notIn: [''] } },
          { directoryContactPhone: null, telefono: { not: '' } },
        ],
      },
    ],
  };
}

export const IDENTIFICATION_TYPES = {
  ECUADORIAN_ID: 'cedula_ecuatoriana',
  FOREIGN_DOCUMENT: 'documento_extranjero',
}

export const IDENTIFICATION_TYPE_LABELS = {
  [IDENTIFICATION_TYPES.ECUADORIAN_ID]: 'Cédula ecuatoriana',
  [IDENTIFICATION_TYPES.FOREIGN_DOCUMENT]: 'Documento extranjero / Pasaporte',
}

export function inferIdentificationType(value, fallback) {
  if (fallback) return fallback

  const normalizedValue = String(value ?? '').trim()

  if (/^\d{10}$/.test(normalizedValue)) {
    return IDENTIFICATION_TYPES.ECUADORIAN_ID
  }

  if (normalizedValue.length > 10 || /[A-Za-z]/.test(normalizedValue)) {
    return IDENTIFICATION_TYPES.FOREIGN_DOCUMENT
  }

  return IDENTIFICATION_TYPES.ECUADORIAN_ID
}

export function sanitizeIdentificationValue(type, value) {
  const rawValue = String(value ?? '')

  if (type === IDENTIFICATION_TYPES.ECUADORIAN_ID) {
    return rawValue.replace(/\D/g, '').slice(0, 10)
  }

  return rawValue
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 20)
}

export function validateIdentification(type, value) {
  const sanitizedValue = sanitizeIdentificationValue(type, value)

  if (type === IDENTIFICATION_TYPES.ECUADORIAN_ID) {
    if (sanitizedValue.length !== 10) {
      return 'La cédula ecuatoriana debe tener exactamente 10 dígitos.'
    }

    return ''
  }

  if (sanitizedValue.length < 6 || sanitizedValue.length > 20) {
    return 'El documento extranjero o pasaporte debe tener entre 6 y 20 caracteres.'
  }

  return ''
}

export function getIdentificationPlaceholder(type) {
  return type === IDENTIFICATION_TYPES.ECUADORIAN_ID
    ? 'Ej: 0102030405'
    : 'Ej: AB1234567'
}

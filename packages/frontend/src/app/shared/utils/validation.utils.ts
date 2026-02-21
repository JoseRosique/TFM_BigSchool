/**
 * Utilidades de validación compartidas entre componentes
 */

/**
 * Valida si un email tiene formato correcto
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/**
 * Valida si un nickname tiene formato correcto
 * Acepta letras, números, guiones y guiones bajos
 * Debe tener entre 3 y 100 caracteres
 */
export function isValidNickname(nickname: string): boolean {
  if (!nickname) return false;
  const trimmed = nickname.trim();
  if (trimmed.length < 3 || trimmed.length > 100) {
    return false;
  }
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

/**
 * Valida si una contraseña cumple los requisitos mínimos
 */
export function isValidPassword(password: string): boolean {
  return !!password && password.length >= 8;
}

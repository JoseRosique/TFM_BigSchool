/**
 * Mapea errores de Google Auth a claves i18n correspondientes
 * Usado por LoginCardComponent para mostrar mensajes localizados
 */
export class GoogleAuthErrorMapper {
  static mapErrorToI18nKey(errorMessage: string): string {
    if (!errorMessage) {
      return 'AUTH.GOOGLE_SIGN_IN.ERRORS.SDK_NOT_READY';
    }

    const msg = errorMessage.toLowerCase();

    if (msg.includes('client_id') || msg.includes('not configured')) {
      return 'AUTH.GOOGLE_SIGN_IN.ERRORS.NOT_CONFIGURED';
    }

    if (msg.includes('timeout')) {
      return 'AUTH.GOOGLE_SIGN_IN.ERRORS.TIMEOUT';
    }

    if (msg.includes('csp') || msg.includes('content security policy')) {
      return 'AUTH.GOOGLE_SIGN_IN.ERRORS.CSP_BLOCKED';
    }

    if (msg.includes('network') || msg.includes('net::')) {
      return 'AUTH.GOOGLE_SIGN_IN.ERRORS.NETWORK_ERROR';
    }

    if (msg.includes('container')) {
      return 'AUTH.GOOGLE_SIGN_IN.ERRORS.CONTAINER_NOT_FOUND';
    }

    if (msg.includes('load failed')) {
      return 'AUTH.GOOGLE_SIGN_IN.ERRORS.SDK_LOAD_FAILED';
    }

    if (msg.includes('not ready')) {
      return 'AUTH.GOOGLE_SIGN_IN.ERRORS.SDK_NOT_READY';
    }

    // Default
    return 'AUTH.GOOGLE_SIGN_IN.ERRORS.SDK_LOAD_FAILED';
  }
}

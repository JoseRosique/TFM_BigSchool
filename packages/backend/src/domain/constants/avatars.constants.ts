/**
 * Constantes de avatares predeterminados
 * Define los avatares disponibles para asignar a nuevos usuarios
 * Formato: /assets/avatars/avatar-XX.{svg|jpg|jpeg|png}
 */

/**
 * Avatar predeterminado para nuevos usuarios de registro social (Google, etc.)
 */
export const DEFAULT_SOCIAL_AVATAR = '/assets/avatars/avatar-1.svg';

/**
 * Avatar predeterminado para nuevos usuarios de registro tradicional
 */
export const DEFAULT_REGULAR_AVATAR = '/assets/avatars/avatar-1.svg';

/**
 * Lista de avatares disponibles en el sistema
 */
export const AVAILABLE_AVATARS = [
  '/assets/avatars/avatar-1.svg',
  '/assets/avatars/avatar-2.svg',
  '/assets/avatars/avatar-3.svg',
  '/assets/avatars/avatar-4.svg',
  '/assets/avatars/avatar-5.svg',
  '/assets/avatars/avatar-6.svg',
  '/assets/avatars/avatar-7.svg',
  '/assets/avatars/avatar-8.svg',
  '/assets/avatars/avatar-9.svg',
  '/assets/avatars/avatar-10.svg',
  '/assets/avatars/avatar-11.svg',
  '/assets/avatars/avatar-12.svg',
  '/assets/avatars/avatar-13.jpg',
  '/assets/avatars/avatar-14.jpeg',
  '/assets/avatars/avatar-15.png',
] as const;

/**
 * Obtiene un avatar aleatorio de la lista disponible
 */
export function getRandomAvatar(): string {
  const randomIndex = Math.floor(Math.random() * AVAILABLE_AVATARS.length);
  return AVAILABLE_AVATARS[randomIndex];
}

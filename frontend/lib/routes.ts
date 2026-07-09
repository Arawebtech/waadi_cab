/** Routes accessible without authentication */
export const PUBLIC_PAGES = [
  '/',
  '/login',
  '/signup',
  '/otp-verification',
  '/terms-conditions',
] as const

export type PublicPage = (typeof PUBLIC_PAGES)[number]

export function isPublicPage(pathname: string): boolean {
  return (PUBLIC_PAGES as readonly string[]).includes(pathname)
}

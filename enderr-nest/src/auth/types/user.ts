/**
 * User information from JWT token
 * @remarks Used in controllers to identify the authenticated user
 */
export interface UserFromJwt {
  id: string;
  email: string;
  name: string;
}

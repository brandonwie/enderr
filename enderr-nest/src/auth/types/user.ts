/**
 * User information extracted from JWT token
 * @remarks This is the user object attached to requests by the JWT strategy
 */
export interface UserFromJwt {
  id: string;
  email: string;
  name: string;
  picture: string;
}

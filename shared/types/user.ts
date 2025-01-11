/**
 * Represents a user in the system
 * @remarks This type is used in both frontend and backend
 */
export interface User {
  /** Unique identifier for the user */
  id: string;
  /** User's email address from Google OAuth */
  email: string;
  /** User's full name from Google OAuth */
  name: string;
  /** URL to user's profile image from Google OAuth */
  profileImage: string;
  /** Timestamp when the user was created */
  createdAt: Date;
  /** Timestamp when the user was last updated */
  updatedAt: Date;
}

/**
 * Represents the minimal user information needed for display
 * @remarks Used when we don't need the full user object
 */
export type UserBasicInfo = Pick<User, "id" | "name" | "profileImage">;

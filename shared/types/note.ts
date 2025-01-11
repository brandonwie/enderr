import { Schedule } from "./schedule";
import { UserBasicInfo } from "./user";

/**
 * Represents a note in the system
 * @remarks Notes can be attached to schedules and edited concurrently by multiple users
 */
export interface Note {
  /** Unique identifier for the note */
  id: string;
  /** Title of the note */
  title: string;
  /** Content of the note in markdown format */
  content: string;
  /** Schedules this note is attached to */
  schedules?: Schedule[];
  /** Creator of the note */
  creator: UserBasicInfo;
  /** Users who have access to edit this note */
  collaborators: UserBasicInfo[];
  /** Version number for concurrent editing */
  version: number;
  /** Timestamp when the note was created */
  createdAt: Date;
  /** Timestamp when the note was last updated */
  updatedAt: Date;
}

/**
 * Represents a change in the note's content
 * @remarks Used for implementing Operational Transformation for concurrent editing
 */
export interface NoteOperation {
  /** Unique identifier for the operation */
  id: string;
  /** ID of the note being modified */
  noteId: string;
  /** User who made the change */
  userId: string;
  /** Version number this operation is based on */
  baseVersion: number;
  /** Type of operation (insert, delete, etc.) */
  type: "insert" | "delete" | "replace";
  /** Position in the content where the operation starts */
  position: number;
  /** Content being inserted or deleted */
  content?: string;
  /** Length of content being affected (for delete operations) */
  length?: number;
  /** Timestamp when the operation was created */
  timestamp: Date;
}

/**
 * Represents the minimal note information needed for display
 * @remarks Used when listing notes or showing previews
 */
export type NoteBasicInfo = Pick<
  Note,
  "id" | "title" | "creator" | "updatedAt"
>;

import { Schedule } from "./schedule";
import { UserBasicInfo } from "./user";

/**
 * Represents a block in a note
 * @remarks Each line in the note is a block, similar to Notion
 */
export interface NoteBlock {
  /** Unique identifier for the block */
  id: string;
  /** Block type (paragraph, heading, etc.) */
  type: "p" | "h1" | "h2" | "h3" | "code";
  /** Block content in markdown */
  content: string;
  /** Order of the block in the note */
  order: number;
}

/**
 * Represents a note in the system
 * @remarks Notes can be attached to schedules and edited concurrently by multiple users
 */
export interface Note {
  /** Unique identifier for the note */
  id: string;
  /** Title of the note */
  title: string;
  /** Blocks of content */
  blocks: NoteBlock[];
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
 * Represents a change in a block's content
 * @remarks Used for implementing block-based collaborative editing
 */
export interface BlockOperation {
  /** ID of the block being modified */
  blockId: string;
  /** Type of operation */
  type: "update" | "create" | "delete" | "move";
  /** Current content of the block (for update operations) */
  content?: string;
  /** New block type (for create/update operations) */
  blockType?: NoteBlock["type"];
  /** New order position (for move operations) */
  order?: number;
  /** Base version of the block when operation was created */
  baseVersion: number;
  /** Timestamp of the operation */
  timestamp: Date;
}

/**
 * Represents a batch of operations on a note
 * @remarks Used when sending operations to the server
 */
export interface NoteOperationBatch {
  /** Note ID */
  noteId: string;
  /** User making the changes */
  userId: string;
  /** Array of block operations */
  operations: BlockOperation[];
  /** Current note version */
  baseVersion: number;
}

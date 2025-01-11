import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { UserFromJwt } from '../auth/types/user';
import { NoteOperationBatch } from '@shared/types/note';
import { NoteService } from './note.service';

/**
 * Controller for handling note-related operations
 * @remarks Implements block-based collaborative editing similar to Notion
 */
@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NoteController {
  private readonly logger = new Logger(NoteController.name);

  constructor(private readonly noteService: NoteService) {}

  /**
   * Create a new note with initial empty block
   * @remarks Creates a note with a single paragraph block
   */
  @Post()
  async createNote(
    @User() user: UserFromJwt,
    @Body('title') title: string,
    @Body('initialContent') initialContent?: string,
  ) {
    this.logger.log(`Creating note for user ${user.id}`);
    return this.noteService.create(user.id, title, initialContent);
  }

  /**
   * Get a specific note with all its blocks
   * @remarks Blocks are returned in order for rendering
   */
  @Get(':id')
  async getNote(@Param('id') id: string) {
    return this.noteService.findOne(id);
  }

  /**
   * Update a block in a note
   * @remarks Client sends operations when:
   * 1. User switches to another block
   * 2. User presses Enter (creates new block)
   * 3. After debounce timeout (e.g., 2 seconds of no typing)
   * @example
   * ```typescript
   * // Example payload for updating a block's content
   * {
   *   operations: [{
   *     blockId: "block1",
   *     type: "update",
   *     content: "New content",
   *     baseVersion: 1
   *   }],
   *   baseVersion: 1
   * }
   * ```
   */
  @Post(':id/blocks')
  async updateBlock(
    @Param('id') id: string,
    @User() user: UserFromJwt,
    @Body() batch: Omit<NoteOperationBatch, 'noteId' | 'userId'>,
  ) {
    const blockId = batch.operations[batch.operations.length - 1].blockId;
    this.logger.log(`Updating block ${blockId} in note ${id}`);

    const fullBatch: NoteOperationBatch = {
      ...batch,
      noteId: id,
      userId: user.id,
    };

    return this.noteService.updateBlock(id, fullBatch);
  }

  /**
   * Add a collaborator to a note
   * @remarks Collaborators can edit the note and see its history
   */
  @Post(':id/collaborators')
  async addCollaborator(
    @Param('id') id: string,
    @Body('userId') collaboratorId: string,
  ) {
    this.logger.log(`Adding collaborator ${collaboratorId} to note ${id}`);
    return this.noteService.addCollaborator(id, collaboratorId);
  }

  /**
   * Delete a note and all its blocks
   * @remarks This will cascade delete all blocks
   */
  @Delete(':id')
  async deleteNote(@Param('id') id: string) {
    this.logger.log(`Deleting note ${id}`);
    return this.noteService.delete(id);
  }
}

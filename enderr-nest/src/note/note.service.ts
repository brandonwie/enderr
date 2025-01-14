import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DynamoDBService } from '../dynamodb.service';
import { NoteOperationBatch } from '@shared/types/note';

const MAX_OPERATIONS_PER_BATCH = 50;

@Injectable()
export class NoteService {
  private readonly logger = new Logger(NoteService.name);

  constructor(
    private prisma: PrismaService,
    private dynamodb: DynamoDBService,
  ) {}

  /**
   * Creates a new note with initial blocks
   * @remarks Blocks are created with order numbers for sorting
   */
  async create(userId: string, title: string, initialContent?: string) {
    const note = await this.prisma.note.create({
      data: {
        title,
        creator: { connect: { id: userId } },
        blocks: {
          create: [
            {
              type: 'h1',
              content: initialContent || '',
              order: 0,
            },
          ],
        },
      },
      include: {
        creator: true,
        collaborators: true,
        blocks: true,
      },
    });

    this.logger.log(`Created note ${note.id} with initial block`);
    return note;
  }

  /**
   * Updates a single block in a note and records its final state in DynamoDB
   * @remarks Frontend sends the request when user switches blocks or after debounce
   */
  async updateBlock(noteId: string, batch: NoteOperationBatch) {
    if (batch.operations.length > MAX_OPERATIONS_PER_BATCH) {
      throw new BadRequestException(
        `Cannot process more than ${MAX_OPERATIONS_PER_BATCH} operations at once`,
      );
    }

    // Get note and check version for conflicts
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: { blocks: true },
    });

    if (!note) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }

    // Get the final state (last operation)
    const finalOperation = batch.operations[batch.operations.length - 1];
    const savedBlock = note.blocks.find((b) => b.id === finalOperation.blockId);

    // Check for conflicts
    if (savedBlock && savedBlock.version > batch.baseVersion) {
      // Get latest operations from DynamoDB to resolve conflict
      const operations = await this.dynamodb.queryBlockOperations(
        noteId,
        finalOperation.blockId,
      );

      const latestOperation = operations?.[0]?.operation;

      if (latestOperation) {
        // If there's a conflict, merge the changes
        // Strategy: Last-write-wins with preserved formatting
        finalOperation.content = this.mergeContent(
          latestOperation.content || '',
          finalOperation.content || '',
        );
      }
    }

    // Store final state in DynamoDB
    await this.dynamodb.putItem({
      TableName: 'NoteOperations',
      Item: {
        noteId,
        blockId: finalOperation.blockId,
        userId: batch.userId,
        operation: finalOperation,
        timestamp: new Date().toISOString(),
        version: note.version,
      },
    });

    // Apply the operation in PostgreSQL
    await this.prisma.$transaction(async (prisma) => {
      switch (finalOperation.type) {
        case 'create':
          await prisma.block.create({
            data: {
              id: finalOperation.blockId,
              type: finalOperation.blockType!,
              content: finalOperation.content || '',
              order: finalOperation.order!,
              note: { connect: { id: noteId } },
            },
          });
          break;

        case 'update':
          await prisma.block.update({
            where: { id: finalOperation.blockId },
            data: {
              content: finalOperation.content,
              type: finalOperation.blockType,
              version: { increment: 1 },
            },
          });
          break;

        case 'delete':
          await prisma.block.delete({
            where: { id: finalOperation.blockId },
          });
          break;

        case 'move':
          await prisma.block.update({
            where: { id: finalOperation.blockId },
            data: { order: finalOperation.order },
          });
          break;
      }

      // Update note version
      await prisma.note.update({
        where: { id: noteId },
        data: { version: { increment: 1 } },
      });
    });

    this.logger.log(
      `Updated block ${finalOperation.blockId} in note ${noteId}`,
    );

    // Return updated note
    return this.prisma.note.findUnique({
      where: { id: noteId },
      include: {
        blocks: {
          orderBy: { order: 'asc' },
        },
        creator: true,
        collaborators: true,
      },
    });
  }

  /**
   * Merge two versions of content when there's a conflict
   * @remarks Uses a simple last-write-wins strategy while preserving formatting
   */
  private mergeContent(serverContent: string, clientContent: string): string {
    // For now, using a simple last-write-wins strategy
    // TODO: Implement more sophisticated merging if needed
    return clientContent;
  }

  /**
   * Adds a collaborator to a note
   * @remarks Collaborators can edit the note and see its history
   * @throws {BadRequestException} If trying to add creator as collaborator or duplicate collaborator
   */
  async addCollaborator(noteId: string, userId: string) {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: {
        creator: true,
        collaborators: true,
      },
    });

    if (!note) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }

    // Check if user is the creator
    if (note.creatorId === userId) {
      throw new BadRequestException('Cannot add creator as collaborator');
    }

    // Check if user is already a collaborator
    if (note.collaborators.some((c) => c.id === userId)) {
      throw new BadRequestException('User is already a collaborator');
    }

    return this.prisma.note.update({
      where: { id: noteId },
      data: {
        collaborators: {
          connect: { id: userId },
        },
      },
      include: {
        blocks: {
          orderBy: { order: 'asc' },
        },
        creator: true,
        collaborators: true,
      },
    });
  }

  /**
   * Retrieves a note with all its blocks and related data
   */
  async findOne(id: string) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: {
        blocks: {
          orderBy: { order: 'asc' },
        },
        creator: true,
        collaborators: true,
        schedule: true,
      },
    });

    if (!note) {
      throw new NotFoundException(`Note ${id} not found`);
    }

    return note;
  }

  /**
   * Deletes a note and all its blocks
   * @remarks This will cascade delete all blocks in PostgreSQL and operations in DynamoDB
   */
  async delete(id: string) {
    // First get all block IDs to delete from DynamoDB
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: { blocks: true },
    });

    if (!note) {
      throw new NotFoundException(`Note ${id} not found`);
    }

    // Delete from PostgreSQL (this will cascade delete blocks)
    await this.prisma.note.delete({
      where: { id },
    });

    // Delete all operations from DynamoDB
    const keys = note.blocks.map((block) => ({
      noteId: id,
      blockId: block.id,
    }));

    await this.dynamodb.batchDeleteItems('NoteOperations', keys);

    this.logger.log(
      `Deleted note ${id} and all its blocks from PostgreSQL and DynamoDB`,
    );
  }
}

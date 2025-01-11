import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DynamoDBService } from '../dynamodb.service';
import { BlockOperation, NoteOperationBatch } from '@shared/types/note';

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
              type: 'paragraph',
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
   * Applies a batch of operations to blocks in a note
   * @remarks Only stores the last operation for each block since it represents the current state
   */
  async applyOperations(noteId: string, batch: NoteOperationBatch) {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: { blocks: true },
    });

    if (!note) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }

    // Group operations by blockId and get only the last operation for each block
    const lastOperationsByBlock = batch.operations.reduce(
      (acc, op) => {
        acc[op.blockId] = op; // Each new operation overwrites the previous one
        return acc;
      },
      {} as Record<string, BlockOperation>,
    );

    // Log only the last operation for each block in DynamoDB
    await Promise.all(
      Object.values(lastOperationsByBlock).map((op) =>
        this.dynamodb.putItem({
          TableName: 'NoteOperations',
          Item: {
            noteId,
            blockId: op.blockId,
            userId: batch.userId,
            operation: op,
            timestamp: new Date().toISOString(),
            version: note.version,
          },
        }),
      ),
    );

    // Apply operations to PostgreSQL
    await this.prisma.$transaction(async (tx) => {
      for (const op of batch.operations) {
        switch (op.type) {
          case 'create':
            await tx.block.create({
              data: {
                id: op.blockId,
                type: op.blockType!,
                content: op.content || '',
                order: op.order!,
                note: { connect: { id: noteId } },
              },
            });
            break;

          case 'update':
            await tx.block.update({
              where: { id: op.blockId },
              data: {
                content: op.content,
                type: op.blockType,
                version: { increment: 1 },
              },
            });
            break;

          case 'delete':
            await tx.block.delete({
              where: { id: op.blockId },
            });
            break;

          case 'move':
            await tx.block.update({
              where: { id: op.blockId },
              data: { order: op.order },
            });
            break;
        }
      }

      // Update note version
      await tx.note.update({
        where: { id: noteId },
        data: { version: { increment: 1 } },
      });
    });

    this.logger.log(
      `Applied ${batch.operations.length} operations to note ${noteId}`,
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
   * Adds a collaborator to a note
   * @remarks Collaborators can edit the note and see its history
   */
  async addCollaborator(noteId: string, userId: string) {
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
        schedules: true,
      },
    });

    if (!note) {
      throw new NotFoundException(`Note ${id} not found`);
    }

    return note;
  }

  /**
   * Deletes a note and all its blocks
   * @remarks This will cascade delete all blocks
   */
  async delete(id: string) {
    await this.prisma.note.delete({
      where: { id },
    });
    this.logger.log(`Deleted note ${id} and all its blocks`);
  }
}

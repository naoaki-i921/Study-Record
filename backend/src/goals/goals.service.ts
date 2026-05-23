import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto, UpdateGoalDto, UpdateTodoDto } from './dto/goal.dto';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateGoalDto) {
    return this.prisma.goal.create({
      data: {
        userId,
        title: dto.title,
        categoryId: dto.categoryId,
        targetMinutes: dto.targetMinutes,
        deadline: new Date(dto.deadline),
        todos: {
          create: dto.todos?.map(content => ({ content })) || [],
        },
      },
      include: { todos: true, category: true },
    });
  }

  async findAllByUser(userId: number) {
    return this.prisma.goal.findMany({
      where: { userId },
      include: {
        records: {
          orderBy: { date: 'desc' },
        },
        todos: {
          orderBy: { createdAt: 'asc' },
        },
        category: true,
      },
      orderBy: { deadline: 'asc' },
    });
  }

  async update(goalId: number, userId: number, dto: UpdateGoalDto) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== userId) throw new NotFoundException('Not found');

    return this.prisma.goal.update({
      where: { id: goalId },
      data: {
        title: dto.title !== undefined ? dto.title : goal.title,
        categoryId: dto.categoryId !== undefined ? dto.categoryId : goal.categoryId,
        targetMinutes: dto.targetMinutes !== undefined ? dto.targetMinutes : goal.targetMinutes,
        deadline: dto.deadline !== undefined ? new Date(dto.deadline) : goal.deadline,
        isCompleted: dto.isCompleted !== undefined ? dto.isCompleted : goal.isCompleted,
      },
      include: { category: true, todos: true },
    });
  }

  async addTodo(userId: number, goalId: number, content: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== userId) throw new NotFoundException('Goal not found');

    return this.prisma.todo.create({
      data: {
        goalId,
        content,
      },
    });
  }

  async updateTodo(userId: number, todoId: number, dto: UpdateTodoDto) {
    const todo = await this.prisma.todo.findUnique({
      where: { id: todoId },
      include: { goal: true },
    });

    if (!todo || todo.goal.userId !== userId) {
      throw new NotFoundException('Todo not found');
    }

    return this.prisma.todo.update({
      where: { id: todoId },
      data: { 
        isCompleted: dto.isCompleted !== undefined ? dto.isCompleted : todo.isCompleted,
        content: dto.content !== undefined ? dto.content : todo.content,
      },
    });
  }

  async deleteTodo(userId: number, todoId: number) {
    const todo = await this.prisma.todo.findUnique({
      where: { id: todoId },
      include: { goal: true },
    });

    if (!todo || todo.goal.userId !== userId) {
      throw new NotFoundException('Todo not found');
    }

    return this.prisma.todo.delete({
      where: { id: todoId },
    });
  }

  async delete(goalId: number, userId: number) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== userId) throw new Error('Not found');

    return this.prisma.goal.delete({
      where: { id: goalId },
    });
  }

  // Returns progress in minutes for a specific goal
  async getGoalProgress(goalId: number, userId: number) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal || goal.userId !== userId) return 0;

    // Sum study records that are explicitly linked to this goal.
    // We can also include fallback logic for older records if needed, but going forward it should use goalId.
    const result = await this.prisma.studyRecord.aggregate({
      where: {
        userId,
        // Match explicit goalId OR fallback to dates if no record exists for this goal yet?
        // To be safe and precise, we will only count records explicitly assigned to this goal.
        goalId: goal.id
      },
      _sum: {
        durationMinutes: true,
      },
    });

    return result._sum.durationMinutes || 0;
  }
}

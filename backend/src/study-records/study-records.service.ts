import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudyRecordDto, UpdateStudyRecordDto } from './dto/study-record.dto';

@Injectable()
export class StudyRecordsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateStudyRecordDto) {
    return this.prisma.studyRecord.create({
      data: {
        userId,
        date: new Date(dto.date),
        durationMinutes: dto.durationMinutes,
        content: dto.content,
        goalId: dto.goalId,
      },
    });
  }

  async findAllByUser(userId: number) {
    return this.prisma.studyRecord.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });
  }

  async update(userId: number, id: number, dto: UpdateStudyRecordDto) {
    const record = await this.prisma.studyRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Record not found');
    if (record.userId !== userId) throw new ForbiddenException();

    return this.prisma.studyRecord.update({
      where: { id },
      data: {
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.content && { content: dto.content }),
        ...(dto.goalId !== undefined && { goalId: dto.goalId }),
      },
    });
  }

  async remove(userId: number, id: number) {
    const record = await this.prisma.studyRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Record not found');
    if (record.userId !== userId) throw new ForbiddenException();

    return this.prisma.studyRecord.delete({ where: { id } });
  }

  async getTotalDurationByUser(userId: number) {
    const result = await this.prisma.studyRecord.aggregate({
      where: { userId },
      _sum: {
        durationMinutes: true,
      },
    });
    return result._sum.durationMinutes || 0;
  }
}

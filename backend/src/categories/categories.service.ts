import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateCategoryDto) {
    // Check for existing category with same name for this user
    const existing = await this.prisma.category.findUnique({
      where: {
        userId_name: {
          userId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException('既に同じ名前のカテゴリーが存在します');
    }

    return this.prisma.category.create({
      data: {
        userId,
        name: dto.name,
      },
    });
  }

  async findAllByUser(userId: number) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async remove(userId: number, id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) throw new NotFoundException();
    if (category.userId !== userId) throw new ForbiddenException();

    return this.prisma.category.delete({
      where: { id },
    });
  }
}

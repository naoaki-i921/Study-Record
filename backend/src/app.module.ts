import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { StudyRecordsModule } from './study-records/study-records.module';
import { GoalsModule } from './goals/goals.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, StudyRecordsModule, GoalsModule, CategoriesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

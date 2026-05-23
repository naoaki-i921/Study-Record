import { Module } from '@nestjs/common';
import { StudyRecordsController } from './study-records.controller';
import { StudyRecordsService } from './study-records.service';

@Module({
  controllers: [StudyRecordsController],
  providers: [StudyRecordsService]
})
export class StudyRecordsModule {}

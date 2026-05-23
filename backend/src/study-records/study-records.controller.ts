import { Controller, Post, Get, Body, UseGuards, Request, Patch, Param, Delete } from '@nestjs/common';
import { StudyRecordsService } from './study-records.service';
import { CreateStudyRecordDto, UpdateStudyRecordDto } from './dto/study-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('study-records')
@UseGuards(JwtAuthGuard)
export class StudyRecordsController {
  constructor(private readonly studyRecordsService: StudyRecordsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateStudyRecordDto) {
    return this.studyRecordsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.studyRecordsService.findAllByUser(req.user.userId);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateStudyRecordDto) {
    return this.studyRecordsService.update(req.user.userId, +id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.studyRecordsService.remove(req.user.userId, +id);
  }

  @Get('total-duration')
  async getTotalDuration(@Request() req: any) {
    const total = await this.studyRecordsService.getTotalDurationByUser(req.user.userId);
    return { totalDurationMinutes: total };
  }
}

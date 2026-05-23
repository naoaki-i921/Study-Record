import { Test, TestingModule } from '@nestjs/testing';
import { StudyRecordsService } from './study-records.service';

describe('StudyRecordsService', () => {
  let service: StudyRecordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudyRecordsService],
    }).compile();

    service = module.get<StudyRecordsService>(StudyRecordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

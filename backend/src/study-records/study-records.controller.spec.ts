import { Test, TestingModule } from '@nestjs/testing';
import { StudyRecordsController } from './study-records.controller';

describe('StudyRecordsController', () => {
  let controller: StudyRecordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudyRecordsController],
    }).compile();

    controller = module.get<StudyRecordsController>(StudyRecordsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

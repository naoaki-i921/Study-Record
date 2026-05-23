export class CreateStudyRecordDto {
  date!: string; // ISO date string or yyyy-mm-dd
  durationMinutes!: number;
  content!: string;
  goalId?: number;
}

export class UpdateStudyRecordDto {
  date?: string;
  durationMinutes?: number;
  content?: string;
  goalId?: number;
}

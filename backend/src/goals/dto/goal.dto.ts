export class CreateGoalDto {
  title!: string;
  categoryId?: number;
  targetMinutes!: number;
  deadline!: string;
  todos?: string[];
}

export class UpdateGoalDto {
  title?: string;
  categoryId?: number;
  targetMinutes?: number;
  deadline?: string;
  isCompleted?: boolean;
}

export class UpdateTodoDto {
  isCompleted?: boolean;
  content?: string;
}

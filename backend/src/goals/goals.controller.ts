import { Controller, Get, Post, Body, UseGuards, Request, Patch, Param, Delete } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateGoalDto, UpdateGoalDto, UpdateTodoDto } from './dto/goal.dto';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  create(@Request() req, @Body() createGoalDto: CreateGoalDto) {
    return this.goalsService.create(req.user.userId, createGoalDto);
  }

  @Get()
  async findAll(@Request() req) {
    const goals = await this.goalsService.findAllByUser(req.user.userId);
    
    // Attach progress to each goal
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const progress = await this.goalsService.getGoalProgress(goal.id, req.user.userId);
        return {
          ...goal,
          progressMinutes: progress,
        };
      })
    );

    return goalsWithProgress;
  }

  @Patch(':id')
  update(@Param('id') id: string, @Request() req, @Body() updateGoalDto: UpdateGoalDto) {
    return this.goalsService.update(+id, req.user.userId, updateGoalDto);
  }

  @Post(':id/todos')
  addTodo(@Param('id') id: string, @Request() req, @Body() createTodoDto: { content: string }) {
    return this.goalsService.addTodo(req.user.userId, +id, createTodoDto.content);
  }

  @Patch('todos/:todoId')
  updateTodo(@Param('todoId') todoId: string, @Request() req, @Body() updateTodoDto: UpdateTodoDto) {
    return this.goalsService.updateTodo(req.user.userId, +todoId, updateTodoDto);
  }

  @Delete('todos/:todoId')
  deleteTodo(@Param('todoId') todoId: string, @Request() req) {
    return this.goalsService.deleteTodo(req.user.userId, +todoId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req) {
    return this.goalsService.delete(+id, req.user.userId);
  }
}

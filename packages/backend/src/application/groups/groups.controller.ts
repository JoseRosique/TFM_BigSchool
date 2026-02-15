import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { ListGroupsQueryDto } from './dto/list-groups.dto';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  async list(@Request() req: any, @Query() query: ListGroupsQueryDto) {
    return this.groupsService.listGroups(req.user.userId, query.search);
  }

  @Get('search')
  async search(@Request() req: any, @Query('term') term?: string) {
    return this.groupsService.searchGroups(req.user.userId, term);
  }

  @Post()
  async create(@Request() req: any, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(req.user.userId, dto);
  }

  @Patch(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.updateGroup(req.user.userId, id, dto);
  }

  @Patch(':id/members')
  async updateMembers(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.updateGroup(req.user.userId, id, dto);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.groupsService.deleteGroup(req.user.userId, id);
    return { message: 'GROUP_DELETED' };
  }

  @Get(':id/available-friends')
  async availableFriends(
    @Request() req: any,
    @Param('id') id: string,
    @Query('search') search?: string,
  ) {
    return this.groupsService.getAvailableFriends(req.user.userId, id, search);
  }
}

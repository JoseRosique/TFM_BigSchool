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
import { OpenSlotDTO, Slot } from '@meetwithfriends/shared';
import { SlotsService } from './slots.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { ListSlotsQueryDto } from './dto/list-slots.dto';

@Controller('slots')
@UseGuards(JwtAuthGuard)
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateSlotDto): Promise<OpenSlotDTO.Response> {
    return this.slotsService.create(req.user.userId, dto);
  }

  @Get()
  async list(@Request() req: any, @Query() query: ListSlotsQueryDto) {
    return this.slotsService.list(req.user.userId, query);
  }

  @Get(':id')
  async get(@Request() req: any, @Param('id') id: string): Promise<Slot> {
    return this.slotsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSlotDto,
  ): Promise<Slot> {
    return this.slotsService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.slotsService.remove(id, req.user.userId);
  }
}

import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReserveSlotDTO } from '@meetwithfriends/shared';
import { ReservationsService } from './reservations.service';
import { ReserveSlotDto } from './dto/reserve-slot.dto';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  async reserve(
    @Request() req: any,
    @Body() dto: ReserveSlotDto,
  ): Promise<ReserveSlotDTO.Response> {
    return this.reservationsService.reserve(req.user.userId, dto);
  }

  @Get('me')
  async listMine(@Request() req: any) {
    return this.reservationsService.listMine(req.user.userId);
  }

  @Get(':id')
  async get(@Request() req: any, @Param('id') id: string) {
    return this.reservationsService.findOne(id, req.user.userId);
  }

  @Delete(':id')
  async cancel(@Request() req: any, @Param('id') id: string) {
    return this.reservationsService.cancel(id, req.user.userId);
  }
}

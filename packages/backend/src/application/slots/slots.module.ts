import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Slot } from '../../domain/entities/slot.entity';
import { Reservation } from '../../domain/entities/reservation.entity';
import { SlotsService } from './slots.service';
import { SlotsController } from './slots.controller';

/**
 * Slots Module
 * Responsabilidad: Crear, editar, eliminar franjas de disponibilidad
 */
@Module({
  imports: [TypeOrmModule.forFeature([Slot, Reservation])],
  providers: [SlotsService],
  controllers: [SlotsController],
  exports: [SlotsService],
})
export class SlotsModule {}

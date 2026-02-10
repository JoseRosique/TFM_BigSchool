import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from '../../domain/entities/reservation.entity';
import { Slot } from '../../domain/entities/slot.entity';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';

/**
 * Reservations Module
 * Responsabilidad: Crear, cancelar reservas; prevenir doble booking
 */
@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Slot])],
  providers: [ReservationsService],
  controllers: [ReservationsController],
  exports: [ReservationsService],
})
export class ReservationsModule {}

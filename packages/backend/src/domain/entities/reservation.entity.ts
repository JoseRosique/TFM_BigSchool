import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReservationStatus } from '@meetwithfriends/shared';
import { Slot } from './slot.entity';
import { User } from './user.entity';

@Entity('reservations')
@Index(['userId', 'createdAt'])
@Index(['slotId'])
@Index('idx_reservations_slot_active', ['slotId'], {
  unique: true,
  where: '"status" = \'created\'',
})
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'slot_id', type: 'uuid' })
  slotId!: string;

  @ManyToOne(() => Slot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'slot_id' })
  slot!: Slot;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.CREATED,
  })
  status!: ReservationStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'canceled_at', type: 'timestamptz', nullable: true })
  canceledAt?: Date;
}

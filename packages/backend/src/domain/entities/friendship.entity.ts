import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  BeforeInsert,
  BeforeUpdate,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum FriendshipStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  BLOCKED = 'BLOCKED',
}

@Entity('friendships')
@Check('requester_id <> recipient_id')
@Index(['requesterId', 'recipientId'], { unique: true })
@Index(['pairKey'], { unique: true })
@Index(['recipientId', 'status'])
@Index(['requesterId', 'status'])
export class Friendship {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'requester_id', type: 'uuid' })
  requesterId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requester_id' })
  requester!: User;

  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient!: User;

  @Column({ name: 'pair_key', type: 'varchar', length: 73, nullable: true })
  pairKey?: string | null;

  @Column({ name: 'blocked_by', type: 'uuid', nullable: true })
  blockedBy?: string | null;

  @Column({ type: 'enum', enum: FriendshipStatus, default: FriendshipStatus.PENDING })
  status!: FriendshipStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  setPairKey(): void {
    if (this.requesterId && this.recipientId) {
      const [first, second] = [this.requesterId, this.recipientId].sort();
      this.pairKey = `${first}:${second}`;
    }
  }
}

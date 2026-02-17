import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToOne,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SlotStatus, VisibilityScope } from '@meetwithfriends/shared';
import { User } from './user.entity';
import { Group } from './group.entity';

@Entity('slots')
@Index(['ownerId', 'start'])
@Index(['status', 'start'])
export class Slot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @Column({ type: 'timestamptz' })
  start!: Date;

  @Column({ type: 'timestamptz' })
  end!: Date;

  @Column({ type: 'varchar', length: 50 })
  timezone!: string;

  @Column({
    type: 'enum',
    enum: VisibilityScope,
    default: VisibilityScope.PRIVATE,
    name: 'visibility_scope',
  })
  visibilityScope!: VisibilityScope;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({
    type: 'enum',
    enum: SlotStatus,
    default: SlotStatus.AVAILABLE,
  })
  status!: SlotStatus;

  @ManyToMany(() => Group, { cascade: false, eager: false })
  @JoinTable({
    name: 'slot_groups',
    joinColumn: { name: 'slot_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'group_id', referencedColumnName: 'id' },
  })
  groups!: Group[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

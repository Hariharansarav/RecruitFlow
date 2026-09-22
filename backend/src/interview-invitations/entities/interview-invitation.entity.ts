import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Candidate } from '../../candidates/entities/candidate.entity';
import { InvitationStatus } from '../enums/invitation-status.enum';

@Entity({ name: 'interview_invitations' })
export class InterviewInvitation {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'candidate_id', type: 'integer' })
  candidate_id: number;

  @ManyToOne(() => Candidate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate: Candidate;

  @Column({ name: 'interviewer_email', type: 'varchar', length: 255, nullable: true })
  interviewer_email: string | null;

  @Column({ name: 'interviewer_name', type: 'varchar', length: 255, nullable: true })
  interviewer_name: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  token: string;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expires_at: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completed_at: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at: Date;
}

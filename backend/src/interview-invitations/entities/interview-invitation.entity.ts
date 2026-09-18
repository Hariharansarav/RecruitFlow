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
import { TechLead } from '../../tech-leads/entities/tech-lead.entity';
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

  @Column({ name: 'tech_lead_id', type: 'integer', nullable: true })
  tech_lead_id: number | null;

  @ManyToOne(() => TechLead, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tech_lead_id' })
  tech_lead: TechLead | null;

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

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';
import { User } from '../../users/entities/user.entity';
import { CandidateStatus } from '../enums/candidate-status.enum';

@Entity({ name: 'candidates' })
export class Candidate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50 })
  phone: string;

  @Column({ type: 'text', default: '' })
  skills: string;

  @Column({ type: 'text', nullable: true })
  resume_url: string;

  @Column({ type: 'text', nullable: true })
  resume_text: string | null;

  @Column({ type: 'float', nullable: true })
  ai_match_percentage: number | null;

  @Column({ type: 'text', nullable: true })
  ai_screening_details: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  interviewer_email: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  interview_date: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  interview_time: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  gmeet_link: string | null;

  @Column({
    type: 'enum',
    enum: CandidateStatus,
    default: CandidateStatus.APPLIED,
  })
  status: CandidateStatus;

  @Column({ name: 'job_id', type: 'integer' })
  job_id: number;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Column({ name: 'submitted_by_id', type: 'integer', nullable: true })
  submitted_by_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'submitted_by_id' })
  submitted_by: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at: Date;
}

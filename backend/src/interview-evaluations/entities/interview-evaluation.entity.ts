import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Candidate } from '../../candidates/entities/candidate.entity';
import { User } from '../../users/entities/user.entity';
import { TechLead } from '../../tech-leads/entities/tech-lead.entity';
import { InterviewEvaluationSkill } from './interview-evaluation-skill.entity';

@Entity({ name: 'interview_evaluations' })
export class InterviewEvaluation {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: 'candidate_id', type: 'integer', unique: true })
  candidate_id: number;

  @ManyToOne(() => Candidate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate: Candidate;

  @Column({ name: 'hr_id', type: 'integer', nullable: true })
  hr_id: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'hr_id' })
  hr: User | null;

  @Column({ name: 'tech_lead_id', type: 'integer', nullable: true })
  tech_lead_id: number | null;

  @ManyToOne(() => TechLead, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tech_lead_id' })
  tech_lead: TechLead | null;

  @Column({
    type: 'decimal',
    precision: 4,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) =>
        value !== null && value !== undefined ? Number(value) : value,
    },
  })
  score: number;

  @Column({
    name: 'jd_match_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | number | null) =>
        value !== null && value !== undefined ? Number(value) : null,
    },
  })
  jd_match_percentage: number | null;

  @Column({ type: 'text' })
  notes: string;

  @OneToMany(() => InterviewEvaluationSkill, (skill) => skill.evaluation, {
    cascade: true,
  })
  skills: InterviewEvaluationSkill[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at: Date;
}


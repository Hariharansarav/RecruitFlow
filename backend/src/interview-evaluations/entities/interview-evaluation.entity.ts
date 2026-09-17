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

  @Column({ name: 'hr_id', type: 'integer' })
  hr_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hr_id' })
  hr: User;

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


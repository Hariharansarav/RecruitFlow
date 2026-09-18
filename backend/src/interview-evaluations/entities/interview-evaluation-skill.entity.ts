import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InterviewEvaluation } from './interview-evaluation.entity';

@Entity({ name: 'interview_evaluation_skills' })
export class InterviewEvaluationSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'evaluation_id', type: 'integer' })
  evaluation_id: number;

  @ManyToOne(() => InterviewEvaluation, (evaluation) => evaluation.skills, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'evaluation_id' })
  evaluation: InterviewEvaluation;

  @Column({ type: 'varchar', length: 100 })
  skill: string;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 1,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) =>
        value !== null && value !== undefined ? Number(value) : value,
    },
  })
  score: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at: Date;
}

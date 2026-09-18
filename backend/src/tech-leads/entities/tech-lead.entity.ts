import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { TechLeadStatus } from '../enums/tech-lead-status.enum';
import { Candidate } from '../../candidates/entities/candidate.entity';

@Entity({ name: 'tech_leads' })
export class TechLead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({
    type: 'enum',
    enum: TechLeadStatus,
    default: TechLeadStatus.ACTIVE,
  })
  status: TechLeadStatus;

  @OneToMany(() => Candidate, (candidate) => candidate.tech_lead)
  candidates: Candidate[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at: Date;
}

import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';
import { CandidatesModule } from './candidates/candidates.module';
import { InterviewEvaluationsModule } from './interview-evaluations/interview-evaluations.module';
import { CompanyModule } from './company/company.module';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { HrModule } from './hr/hr.module';
import { TechLeadsModule } from './tech-leads/tech-leads.module';
import { InterviewInvitationsModule } from './interview-invitations/interview-invitations.module';
import { AiJobModule } from './ai-job/ai-job.module';

@Module({
  imports: [
    // Configure ConfigModule globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Configure TypeORM asynchronously using environment variables
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('DatabaseConfig');

        const host = configService.get<string>('DB_HOST');
        const port = configService.get<number>('DB_PORT', 5432);
        const username = configService.get<string>('DB_USERNAME');
        const password = configService.get<string>('DB_PASSWORD');
        const database = configService.get<string>('DB_DATABASE');
        const isProduction =
          configService.get<string>('NODE_ENV') === 'production';

        if (!host || !username) {
          logger.warn(
            'Database environment variables are incomplete or empty in .env. Please configure DB_HOST, DB_USERNAME, DB_PASSWORD, and DB_DATABASE.',
          );
        }

        // Supabase requires SSL connection
        const isSupabase = host?.includes('supabase') ?? false;
        const enableSsl =
          configService.get<string>('DB_SSL') === 'true' || isSupabase;

        return {
          type: 'postgres',
          host,
          port: Number(port),
          username,
          password,
          database,
          ssl: enableSsl ? { rejectUnauthorized: false } : false,
          autoLoadEntities: true,
          // synchronize: true for development/POC, false in production
          synchronize: !isProduction,
          logging: !isProduction,
        };
      },
    }),
    UsersModule,
    JobsModule,
    CandidatesModule,
    InterviewEvaluationsModule,
    CompanyModule,
    EmailModule,
    AuthModule,
    HrModule,
    TechLeadsModule,
    InterviewInvitationsModule,
    AiJobModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly dataSource: DataSource) {}

  onModuleInit() {
    if (this.dataSource.isInitialized) {
      this.logger.log(
        'Successfully established connection to the PostgreSQL database.',
      );
    } else {
      this.logger.error(
        'Database DataSource initialization failed. Check your database credentials and network connectivity.',
      );
    }
  }
}

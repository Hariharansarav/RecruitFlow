import {
  Injectable,
  UnauthorizedException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * On module init: ensure test users hr@recruitment.com and company@recruitment.com
   * exist with bcrypt-hashed password '123456' for immediate test readiness.
   */
  async onModuleInit() {
    try {
      // 1. Ensure HR test user
      const hrUser = await this.usersService.findByEmail('hr@recruitment.com', true);
      if (hrUser) {
        // If password is not a bcrypt hash or needs update, set to hashed '123456'
        if (!hrUser.password.startsWith('$2')) {
          hrUser.password = await bcrypt.hash(hrUser.password || '123456', 10);
          await this.userRepository.save(hrUser);
          this.logger.log('Upgraded HR test user password to bcrypt hash.');
        }
      } else {
        const hashedPassword = await bcrypt.hash('123456', 10);
        await this.userRepository.save(
          this.userRepository.create({
            name: 'Hariharan',
            email: 'hr@recruitment.com',
            password: hashedPassword,
            role: UserRole.HR,
          }),
        );
        this.logger.log('Created default HR test user (hr@recruitment.com).');
      }

      // 2. Ensure COMPANY test user (company@recruitment.com)
      const companyUser = await this.usersService.findByEmail(
        'company@recruitment.com',
        true,
      );
      if (companyUser) {
        if (!companyUser.password.startsWith('$2')) {
          companyUser.password = await bcrypt.hash(companyUser.password || '123456', 10);
          await this.userRepository.save(companyUser);
          this.logger.log('Upgraded COMPANY test user password to bcrypt hash.');
        }
      } else {
        const hashedPassword = await bcrypt.hash('123456', 10);
        await this.userRepository.save(
          this.userRepository.create({
            name: 'Acme Corp Reviewer',
            email: 'company@recruitment.com',
            password: hashedPassword,
            role: UserRole.COMPANY,
          }),
        );
        this.logger.log('Created default COMPANY test user (company@recruitment.com).');
      }

      // 3. If contact@techcorp.com exists, upgrade its password as well if needed
      const techCorp = await this.usersService.findByEmail('contact@techcorp.com', true);
      if (techCorp && !techCorp.password.startsWith('$2')) {
        techCorp.password = await bcrypt.hash(techCorp.password || '123456', 10);
        await this.userRepository.save(techCorp);
      }
    } catch (err: any) {
      this.logger.warn(`Could not verify seed users: ${err.message}`);
    }
  }

  /**
   * Validate user credentials.
   * Compares password against stored bcrypt hash, with backward-compatibility for plaintext passwords.
   */
  async validateUser(email: string, pass: string): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.findByEmail(email, true);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    let isPasswordValid = false;

    if (user.password && user.password.startsWith('$2')) {
      // Standard bcrypt hash verification
      isPasswordValid = await bcrypt.compare(pass, user.password);
    } else if (user.password) {
      // Legacy plaintext password verification
      isPasswordValid = user.password === pass;
      if (isPasswordValid) {
        // Transparently upgrade plaintext password to bcrypt in DB
        user.password = await bcrypt.hash(pass, 10);
        await this.userRepository.save(user);
        this.logger.log(
          `Transparently upgraded user '${user.email}' to bcrypt password hash.`,
        );
      }
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Omit password from returned object
    const { password: _, ...result } = user;
    return result;
  }

  /**
   * Authenticate user with email and password.
   * Returns user object directly (no JWT).
   */
  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}

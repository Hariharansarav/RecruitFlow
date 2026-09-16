import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Create a new user (HR or COMPANY).
   * Ensures email uniqueness and returns the user without the password.
   */
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const { name, email, password, role } = createUserDto;

    // Check if user with this email already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(`User with email '${email}' already exists`);
    }

    try {
      // NOTE: Password hashing placeholder for Phase 3 (Authentication).
      // Example future implementation: const hashedPassword = await bcrypt.hash(password, 10);
      const userToCreate = this.userRepository.create({
        name,
        email,
        password,
        role,
      });

      const savedUser = await this.userRepository.save(userToCreate);

      // Explicitly omit password before returning
      const { password: _, ...userWithoutPassword } = savedUser;
      return userWithoutPassword;
    } catch (error: any) {
      // Handle PostgreSQL unique constraint violation (error code 23505)
      if (error.code === '23505') {
        throw new ConflictException(
          `User with email '${email}' already exists`,
        );
      }

      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'An unexpected error occurred while creating the user',
      );
    }
  }

  /**
   * Return all users. Password is excluded by default in entity select: false.
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: {
        created_at: 'DESC',
      },
    });
  }

  /**
   * Find a user by email.
   * @param email User email address
   * @param includePassword If true, explicitly selects the password column (useful for future auth login)
   */
  async findByEmail(
    email: string,
    includePassword = false,
  ): Promise<User | null> {
    if (includePassword) {
      return this.userRepository.findOne({
        where: { email },
        select: [
          'id',
          'name',
          'email',
          'password',
          'role',
          'created_at',
          'updated_at',
        ],
      });
    }

    return this.userRepository.findOne({
      where: { email },
    });
  }
}

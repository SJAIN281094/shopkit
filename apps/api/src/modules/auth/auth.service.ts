import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HashService } from '@arhaminnovations/nestjs-crypto';
import { JwtUtilService } from '@arhaminnovations/nestjs-identity';
import { CustomLoggerService } from '@arhaminnovations/nestjs-pino-logger';
import { User } from '../../entities';
import { AuthPayload, LoginInput, SignupInput } from './auth.types';

@Injectable()
export class AuthService {
  private readonly logger: CustomLoggerService;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly hash: HashService,
    private readonly jwt: JwtUtilService,
    logger: CustomLoggerService,
  ) {
    this.logger = logger.forContext(AuthService.name);
  }

  async signup(input: SignupInput): Promise<AuthPayload> {
    const email = input.email.trim().toLowerCase();
    if (await this.users.exists({ where: { email } })) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = await this.users.save(
      this.users.create({
        name: input.name.trim(),
        email,
        passwordHash: await this.hash.hashPassword(input.password),
      }),
    );
    this.logger.logWithBindings('info', { userId: user.id }, 'User signed up');
    return this.issueToken(user);
  }

  async login(input: LoginInput): Promise<AuthPayload> {
    const email = input.email.trim().toLowerCase();
    const user = await this.users.findOne({
      where: { email },
      select: { id: true, name: true, email: true, isActive: true, passwordHash: true, createdAt: true, updatedAt: true },
    });
    const valid = user?.isActive && (await this.hash.comparePassword(input.password, user.passwordHash));
    if (!user || !valid) throw new UnauthorizedException('Invalid email or password');
    return this.issueToken(user);
  }

  async getUser(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private issueToken(user: User): AuthPayload {
    return {
      accessToken: this.jwt.generateToken({ id: user.id, email: user.email }),
      user,
    };
  }
}

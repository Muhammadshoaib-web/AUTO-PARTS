import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import type { JwtPayload } from './strategies/jwt.strategy';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) return null;
    const valid = await bcrypt.compare(password, user.password);
    return valid ? user : null;
  }

  async login(user: User): Promise<AuthTokens> {
    const tokens = await this.generateTokens(user);
    const hash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersService.saveRefreshTokenHash(user.id, hash);
    return tokens;
  }

  async refresh(userId: string, rawRefreshToken: string): Promise<AuthTokens> {
    const user = await this.usersService.findOne(userId);

    if (!user.refreshTokenHash) {
      throw new UnauthorizedException('No active session found.');
    }

    const valid = await bcrypt.compare(rawRefreshToken, user.refreshTokenHash);
    if (!valid) throw new UnauthorizedException('Invalid refresh token.');

    const tokens = await this.generateTokens(user);
    const hash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersService.saveRefreshTokenHash(user.id, hash);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.saveRefreshTokenHash(userId, null);
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersService.findOne(userId);
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect.');
    await this.usersService.update(userId, { password: newPassword });
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.expiry') ?? '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiry') ?? '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtConfigService } from '../config/jwt.config.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private jwtConfigService: JwtConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('User not found');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  /**
   * Login using credentials (email + password).
   * Returns an object with the signed access_token.
   */
  async login(credentials: { email: string; password: string }): Promise<{ message: string }> {
    const user = await this.validateUser(credentials.email, credentials.password);
    const payload = { email: user.email, sub: user.id };
    return { message: 'Login successful'};
  }

  /**
   * Register a new user and return an access token for the created user.
   */
  async register(credentials: { email: string; password: string }): Promise<{ access_token: string; email: string; message: string }> {
    const existing = await this.usersService.findByEmail(credentials.email);
    if (existing) {
      throw new UnauthorizedException('Email already exists');
    }

    const newUser = await this.usersService.createUser(credentials.email, credentials.password);
    const payload = { email: newUser.email, sub: newUser.id };
    return {
      access_token: this.jwtService.sign(payload),
      email: newUser.email,
      message: 'User registered successfully',
    };
  }

  async verifyToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        publicKey: this.jwtConfigService.jwtPublicKey,
        algorithms: ['RS256'],
      });
      return payload;//data inside the token
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
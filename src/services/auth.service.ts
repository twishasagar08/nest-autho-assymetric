import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UsersService } from '../services/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtConfigService } from '../config/jwt.config.service';
import { KafkaProducerService } from '../services/kafka.producer.service';
import { Session } from '../entities/session.entity';

@Injectable()
export class AuthService {
  private readonly MAX_SESSIONS = 3;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private jwtConfigService: JwtConfigService,
    private kafkaProducerService: KafkaProducerService,
    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
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
  async login(
    credentials: { email: string; password: string },
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<{ message: string; access_token: string; activeSessions: number }> {
    const user = await this.validateUser(credentials.email, credentials.password);
    
    // Check current active sessions
    const activeSessions = await this.sessionRepo.count({
      where: { userId: user.id }
    });

    if (activeSessions >= this.MAX_SESSIONS) {
      throw new BadRequestException(
        `Maximum login limit reached. You can only have ${this.MAX_SESSIONS} active sessions. Please logout from another device.`
      );
    }

    const payload = { email: user.email, sub: user.id };
    const token = this.jwtService.sign(payload);
    
    // Create new session
    const session = this.sessionRepo.create({
      userId: user.id,
      token,
      deviceInfo: deviceInfo || 'Unknown',
      ipAddress: ipAddress || 'Unknown',
      lastActivity: new Date(),
    });
    await this.sessionRepo.save(session);
    
    // Publish login event to Kafka
    await this.kafkaProducerService.publish('login', {
      event: 'user_login',
      user: { 
        email: user.email, 
        id: user.id 
      },
      metadata: {
        timestamp: new Date().toISOString(),
        token: token,
        sessionId: session.id,
        activeSessions: activeSessions + 1,
        clientId: process.env.KAFKA_CLIENT_ID || 'nest-auth-app'
      }
    });
    
    return { 
      access_token: token,
      message: 'Login successful',
      activeSessions: activeSessions + 1
    };
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

  /**
   * Logout - removes the session for the given token
   */
  async logout(token: string): Promise<{ message: string }> {
    const session = await this.sessionRepo.findOne({ where: { token } });
    
    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    await this.sessionRepo.remove(session);

    // Publish logout event to Kafka
    await this.kafkaProducerService.publish('logout', {
      event: 'user_logout',
      sessionId: session.id,
      userId: session.userId,
      timestamp: new Date().toISOString(),
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Get all active sessions for a user
   */
  async getActiveSessions(userId: number): Promise<Session[]> {
    return this.sessionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Logout from a specific session by session ID
   */
  async logoutSession(userId: number, sessionId: string): Promise<{ message: string }> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId }
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    await this.sessionRepo.remove(session);

    // Publish logout event to Kafka
    await this.kafkaProducerService.publish('logout', {
      event: 'user_logout',
      sessionId: session.id,
      userId: session.userId,
      timestamp: new Date().toISOString(),
    });

    return { message: 'Session terminated successfully' };
  }

  /**
   * Logout from all sessions (useful for security purposes)
   */
  async logoutAllSessions(userId: number): Promise<{ message: string; sessionsTerminated: number }> {
    const sessions = await this.sessionRepo.find({ where: { userId } });
    const count = sessions.length;

    if (count > 0) {
      await this.sessionRepo.remove(sessions);

      // Publish logout event to Kafka
      await this.kafkaProducerService.publish('logout', {
        event: 'user_logout_all',
        userId,
        sessionsTerminated: count,
        timestamp: new Date().toISOString(),
      });
    }

    return { 
      message: 'All sessions terminated successfully',
      sessionsTerminated: count
    };
  }
}
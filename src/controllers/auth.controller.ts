import { Controller, Post, Get, Delete, Body, Headers, Request, UseGuards, Param } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Controller('auth') // ✅ base path
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('login') // ✅ POST /auth/login
  async login(
    @Body() dto: CreateUserDto,
    @Headers('user-agent') userAgent?: string,
    @Request() req?: any
  ) {
    const deviceInfo = userAgent || 'Unknown';
    const ipAddress = req?.ip || req?.connection?.remoteAddress || 'Unknown';
    
    const response = await this.authService.login(
      { email: dto.email, password: dto.password },
      deviceInfo,
      ipAddress
    );
    
    return { 
      access_token: response.access_token, 
      message: response.message,
      activeSessions: response.activeSessions
    };
  }

  @Post('register') // ✅ POST /auth/register
  async register(@Body() dto: CreateUserDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      return { message: 'Email already exists' };
    }

    // Delegate creation and token creation to AuthService
    return this.authService.register({ email: dto.email, password: dto.password });
  }

  @Post('logout') // ✅ POST /auth/logout
  async logout(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { message: 'No token provided' };
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    return this.authService.logout(token);
  }

  @Get('sessions') // ✅ GET /auth/sessions
  async getSessions(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { message: 'No token provided' };
    }
    
    const token = authHeader.substring(7);
    const payload = await this.authService.verifyToken(token);
    const sessions = await this.authService.getActiveSessions(payload.sub);
    
    return { 
      sessions: sessions.map(s => ({
        id: s.id,
        deviceInfo: s.deviceInfo,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt,
        lastActivity: s.lastActivity
      })),
      count: sessions.length
    };
  }

  @Delete('sessions/:sessionId') // ✅ DELETE /auth/sessions/:sessionId
  async logoutSession(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authHeader: string
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { message: 'No token provided' };
    }
    
    const token = authHeader.substring(7);
    const payload = await this.authService.verifyToken(token);
    
    return this.authService.logoutSession(payload.sub, sessionId);
  }

  @Delete('sessions') // ✅ DELETE /auth/sessions
  async logoutAllSessions(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { message: 'No token provided' };
    }
    
    const token = authHeader.substring(7);
    const payload = await this.authService.verifyToken(token);
    
    return this.authService.logoutAllSessions(payload.sub);
  }
}
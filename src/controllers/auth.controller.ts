import { Controller, Post, Body } from '@nestjs/common';
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
  async login(@Body() dto: CreateUserDto) {
    return this.authService.login({ email: dto.email, password: dto.password });
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
}
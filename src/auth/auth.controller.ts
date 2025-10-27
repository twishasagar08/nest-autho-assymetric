import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Controller('auth') // ✅ base path
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('login') // ✅ POST /auth/login
  async login(@Body() dto: CreateUserDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    return this.authService.login(user);
  }

  @Post('register') // ✅ POST /auth/register
  async register(@Body() dto: CreateUserDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      return { message: 'Email already exists' };
    }

    const newUser = await this.usersService.createUser(dto.email, dto.password);
    return { message: 'User registered successfully', email: newUser.email };
  }
}
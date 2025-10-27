import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule, // so we can use UsersService
    PassportModule,
    JwtModule.register({
      secret: 'mySecretKey', // use env var in real projects
      signOptions: { expiresIn: '1h' }, // token validity
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
import { Module } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from '../services/auth.service';
import { AuthController } from '../controllers/auth.controller';
import { UsersModule } from '../modules/users.module';
import { JwtConfigModule } from '../config/jwt.config.module';//holds the RSA keys and configuration for JWT signing and verifying
import { JwtConfigService } from '../config/jwt.config.service';//seperates key setup from the auth logic
import { KafkaModule } from './kafka.module';
import { Session } from '../entities/session.entity';

@Module({
  imports: [
    UsersModule, // so we can use UsersService
    PassportModule,
    ConfigModule.forRoot(),// loads environment variables automatically from a .env file
    JwtConfigModule,//RSA keys are stored and managed
    KafkaModule,
    TypeOrmModule.forFeature([Session]), // Register Session entity
    JwtModule.registerAsync({//registers the JWT module asyncronously
      imports: [JwtConfigModule],
      inject: [JwtConfigService],// this service provides the actual RSA keys
      useFactory: async (jwtConfigService: JwtConfigService): Promise<JwtModuleOptions> => ({
        privateKey: jwtConfigService.jwtPrivateKey,
        publicKey: jwtConfigService.jwtPublicKey,
        signOptions: {
          expiresIn: '1h',
          algorithm: 'RS256',
        },
      }),
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
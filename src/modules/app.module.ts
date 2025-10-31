import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../modules/users.module';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { AuthModule } from '../modules/auth.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'twisha',
      password: 'postgres',
      database: 'nest_auth_db',
      entities: [User, Session],
      synchronize: true,
    }),
    UsersModule, // ✅ Make sure this is here
    AuthModule
  ],
})
export class AppModule {}
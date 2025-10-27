import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { User } from './users/user.entity';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'twisha',
      password: 'postgres',
      database: 'nest_auth_db',
      entities: [User],
      synchronize: true,
    }),
    UsersModule, // ✅ Make sure this is here
    AuthModule
  ],
})
export class AppModule {}
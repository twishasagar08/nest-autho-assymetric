import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class JwtConfigService {
  private readonly privateKey: string;
  private readonly publicKey: string;

  constructor(private configService: ConfigService) {
    // Read keys from files
    this.privateKey = fs.readFileSync(
      path.join(process.cwd(), 'keys', 'private.key'),
      'utf8',
    );
    this.publicKey = fs.readFileSync(
      path.join(process.cwd(), 'keys', 'public.key'),
      'utf8',
    );
  }

  get jwtPrivateKey(): string {
    return this.privateKey;
  }

  get jwtPublicKey(): string {
    return this.publicKey;
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN') || '1h';
  }
}
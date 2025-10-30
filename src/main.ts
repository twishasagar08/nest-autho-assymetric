import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT) || 3000;
  // Bind to 0.0.0.0 so the server is reachable from other hosts/containers
  await app.listen(port, '0.0.0.0');
  // Helpful log for debugging connection issues
  // eslint-disable-next-line no-console
  console.log(`Nest application listening on http://0.0.0.0:${port}`);
}
bootstrap();

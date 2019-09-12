require('dotenv').config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DEBUG, PORT } from './settings';

const rateLimit = require('express-rate-limit');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(PORT);
  if (DEBUG) {
    app.enableCors();
  } else {
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 150, // limit each IP to 100 requests per windowMs
      })
    );
  }
}

bootstrap().catch(console.error);

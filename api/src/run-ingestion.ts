import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { IngestionService } from './ingestion/ingestion.service';

async function bootstrap() {
  const logger = new Logger('Ingest');
  const app = await NestFactory.createApplicationContext(AppModule);
  const ingestionService = app.get(IngestionService);

  const { fetched, inserted } = await ingestionService.run();
  logger.log(`Ingestion complete: fetched ${fetched}, inserted ${inserted}`);

  await app.close();
}

bootstrap().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});

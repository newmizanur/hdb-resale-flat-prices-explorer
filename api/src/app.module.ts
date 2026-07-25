import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResaleFlatTransaction } from './transactions/entities/resale-flat-transaction.entity';
import { TransactionsModule } from './transactions/transactions.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST') || 'localhost',
          port: parseInt(config.get<string>('DB_PORT') || '5432', 10),
          username: config.get<string>('DB_USER') || 'postgres',
          password: config.get<string>('DB_PASSWORD') || 'postgres',
          database: config.get<string>('DB_NAME') || 'hdb_resale',
          entities: [ResaleFlatTransaction],
          synchronize: (config.get<string>('DB_SYNCHRONIZE') || 'true') === 'true',
        };
      },
    }),
    TransactionsModule,
    IngestionModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}

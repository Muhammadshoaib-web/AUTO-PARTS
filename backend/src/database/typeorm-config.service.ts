import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import * as path from 'path';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const db = this.config.get('database')!;

    return {
      type: 'postgres',
      host: db.host,
      port: db.port,
      database: db.name,
      username: db.user,
      password: db.password,
      synchronize: db.synchronize,
      logging: db.logging,
      ssl: db.ssl ? { rejectUnauthorized: false } : false,
      entities: [path.join(__dirname, '../modules/**/entities/*.entity.{ts,js}')],
      migrations: [path.join(__dirname, './migrations/*.{ts,js}')],
      autoLoadEntities: true,
      extra: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      },
    };
  }
}

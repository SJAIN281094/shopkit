import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import configuration from './config/configuration';
import { ENTITIES } from './entities';

const { database } = configuration();

export default new DataSource({
  type: 'postgres',
  host: database.host,
  port: database.port,
  username: database.username,
  password: database.password,
  database: database.name,
  ssl: database.ssl,
  entities: ENTITIES,
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'typeorm_migrations',
});

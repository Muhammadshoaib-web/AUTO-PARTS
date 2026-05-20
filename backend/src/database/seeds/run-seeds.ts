import { AppDataSource } from '../data-source';
import { runFullSeed } from './full.seed';

async function runSeeds(): Promise<void> {
  await AppDataSource.initialize();
  console.log('Database connected. Running seeds...');

  await runFullSeed(AppDataSource);

  await AppDataSource.destroy();
  console.log('Seeds completed.');
}

runSeeds().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

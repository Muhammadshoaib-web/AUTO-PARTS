import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '@autoparts/shared-types';

export async function seedAdminUser(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(User);
  const existing = await repo.findOne({ where: { email: 'admin@autoparts.pk' } });

  if (existing) {
    console.log('Admin user already exists. Skipping.');
    return;
  }

  const password = await bcrypt.hash('Admin@123', 12);

  await repo.save(
    repo.create({
      name: 'Super Admin',
      email: 'admin@autoparts.pk',
      password,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    }),
  );

  console.log('Admin user created: admin@autoparts.pk / Admin@123');
}

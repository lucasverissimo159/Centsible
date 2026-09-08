import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  const organization = await prisma.organization.upsert({
    where: { id: 'org-demo' },
    update: {},
    create: { id: 'org-demo', name: 'Demo Organization' },
  });
  const user = await prisma.user.upsert({
    where: { email: 'admin@centsible.local' },
    update: { passwordHash },
    create: { email: 'admin@centsible.local', passwordHash },
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    update: { role: 'OWNER' },
    create: { userId: user.id, organizationId: organization.id, role: 'OWNER' },
  });
  for (const category of [
    { id: 'cat-other', name: 'Other', color: '#64748b', icon: 'tag', kind: 'both' as const },
    { id: 'cat-salary', name: 'Salary', color: '#16a34a', icon: 'briefcase', kind: 'income' as const },
    { id: 'cat-groceries', name: 'Groceries', color: '#f97316', icon: 'shopping-cart', kind: 'expense' as const },
  ]) {
    await prisma.category.upsert({
      where: { organizationId_name: { organizationId: organization.id, name: category.name } },
      update: category,
      create: { ...category, organizationId: organization.id, isDefault: true },
    });
  }
  console.log('Seeded admin@centsible.local / ChangeMe123!');
}

main().finally(() => prisma.$disconnect());

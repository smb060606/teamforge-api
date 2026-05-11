import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminHash = await bcrypt.hash('admin123!@#', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@teamforge.dev' },
    update: {},
    create: {
      email: 'admin@teamforge.dev',
      name: 'Admin User',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  // Create developer users
  const devHash = await bcrypt.hash('developer123', 12);
  const alice = await prisma.user.upsert({
    where: { email: 'alice@teamforge.dev' },
    update: {},
    create: {
      email: 'alice@teamforge.dev',
      name: 'Alice Chen',
      passwordHash: devHash,
      role: 'MANAGER',
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@teamforge.dev' },
    update: {},
    create: {
      email: 'bob@teamforge.dev',
      name: 'Bob Martinez',
      passwordHash: devHash,
      role: 'DEVELOPER',
    },
  });

  const carol = await prisma.user.upsert({
    where: { email: 'carol@teamforge.dev' },
    update: {},
    create: {
      email: 'carol@teamforge.dev',
      name: 'Carol Johnson',
      passwordHash: devHash,
      role: 'DEVELOPER',
    },
  });

  // Create teams
  const platformTeam = await prisma.team.upsert({
    where: { slug: 'platform-engineering' },
    update: {},
    create: {
      name: 'Platform Engineering',
      slug: 'platform-engineering',
      description: 'Core infrastructure and developer platform team',
      ownerId: alice.id,
    },
  });

  const productTeam = await prisma.team.upsert({
    where: { slug: 'product-backend' },
    update: {},
    create: {
      name: 'Product Backend',
      slug: 'product-backend',
      description: 'Backend services for core product features',
      ownerId: admin.id,
    },
  });

  // Add team members
  for (const { userId, teamId, role } of [
    { userId: alice.id, teamId: platformTeam.id, role: 'LEAD' as const },
    { userId: bob.id, teamId: platformTeam.id, role: 'MEMBER' as const },
    { userId: carol.id, teamId: platformTeam.id, role: 'MEMBER' as const },
    { userId: admin.id, teamId: productTeam.id, role: 'LEAD' as const },
    { userId: bob.id, teamId: productTeam.id, role: 'MEMBER' as const },
  ]) {
    await prisma.teamMember.upsert({
      where: { userId_teamId: { userId, teamId } },
      update: {},
      create: { userId, teamId, role },
    });
  }

  // Create projects
  const apiGateway = await prisma.project.upsert({
    where: { slug: 'api-gateway' },
    update: {},
    create: {
      name: 'API Gateway',
      slug: 'api-gateway',
      description: 'Central API gateway handling routing, auth, and rate limiting',
      teamId: platformTeam.id,
      status: 'ACTIVE',
      repositoryUrl: 'https://github.com/teamforge/api-gateway',
    },
  });

  const userService = await prisma.project.upsert({
    where: { slug: 'user-service' },
    update: {},
    create: {
      name: 'User Service',
      slug: 'user-service',
      description: 'User authentication, authorization, and profile management',
      teamId: productTeam.id,
      status: 'ACTIVE',
      repositoryUrl: 'https://github.com/teamforge/user-service',
    },
  });

  await prisma.project.upsert({
    where: { slug: 'notification-service' },
    update: {},
    create: {
      name: 'Notification Service',
      slug: 'notification-service',
      description: 'Email, SMS, and push notification delivery system',
      teamId: productTeam.id,
      status: 'MAINTENANCE',
      repositoryUrl: 'https://github.com/teamforge/notification-service',
    },
  });

  console.log('Seed complete!');
  console.log({
    users: [admin.email, alice.email, bob.email, carol.email],
    teams: [platformTeam.slug, productTeam.slug],
    projects: [apiGateway.slug, userService.slug, 'notification-service'],
  });
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

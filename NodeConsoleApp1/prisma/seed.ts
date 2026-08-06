import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/security';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clean existing data
  await prisma.user.deleteMany();
  await prisma.community.deleteMany();

  // Create seed users
  const testPassword = await hashPassword('TestPassword123!');

  const user1 = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      password: testPassword,
      emailVerified: new Date(),
      profile: {
        create: {
          displayName: 'Alice',
          username: 'alice',
          bio: 'Founder of mental health community',
          pronouns: 'she/her',
        },
      },
      preferences: {
        create: {
          language: 'en',
          notificationsEnabled: true,
        },
      },
    },
    include: { profile: true },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      password: testPassword,
      emailVerified: new Date(),
      profile: {
        create: {
          displayName: 'Bob',
          username: 'bob',
          bio: 'Mental health advocate',
          pronouns: 'he/him',
        },
      },
      preferences: {
        create: {
          language: 'en',
          notificationsEnabled: true,
        },
      },
    },
    include: { profile: true },
  });

  // Create test community
  const community = await prisma.community.create({
    data: {
      creatorId: user1.id,
      name: 'Peer Support Circle',
      slug: 'peer-support-circle',
      description: 'A safe space for mental health support and recovery',
      visibility: 'public',
      joinPolicy: 'open',
    },
  });

  // Add members to community
  await prisma.communityMember.create({
    data: {
      communityId: community.id,
      userId: user1.id,
      role: 'member',
    },
  });

  await prisma.communityMember.create({
    data: {
      communityId: community.id,
      userId: user2.id,
      role: 'member',
    },
  });

  // Create crisis resources
  await prisma.crisisResource.create({
    data: {
      name: 'National Crisis Hotline',
      organization: 'Crisis Support Network',
      country: 'US',
      phone: '988',
      description: '24/7 Crisis Support',
      languages: ['en'],
      categories: ['crisis', 'suicide'],
      featured: true,
      verifiedAt: new Date(),
    },
  });

  console.log('Database seed completed successfully!');
  console.log('Created users:', user1.email, user2.email);
  console.log('Created community:', community.name);
}

main()
  .catch(e => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

#!/usr/bin/env ts-node
/**
 * Database backup and restore utilities
 */

import fs from 'fs';
import { execSync } from 'child_process';
import { logger } from '@/config/logger';

function backup(outputPath: string) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = outputPath || `backup-${timestamp}.sql`;

    console.log(`Creating backup: ${filename}`);

    // This assumes PostgreSQL is available in PATH
    execSync(`pg_dump "${process.env.DATABASE_URL}" > ${filename}`, {
      stdio: 'inherit',
    });

    console.log(`✓ Backup created: ${filename}`);
    logger.info({ filename }, 'Database backup created');
  } catch (error) {
    console.error('✗ Backup failed:', error);
    logger.error({ error }, 'Database backup failed');
    process.exit(1);
  }
}

function restore(inputPath: string) {
  try {
    if (!fs.existsSync(inputPath)) {
      console.error(`✗ File not found: ${inputPath}`);
      process.exit(1);
    }

    console.log(`Restoring from: ${inputPath}`);

    execSync(`psql "${process.env.DATABASE_URL}" < ${inputPath}`, {
      stdio: 'inherit',
    });

    console.log('✓ Restore completed');
    logger.info({ inputPath }, 'Database restore completed');
  } catch (error) {
    console.error('✗ Restore failed:', error);
    logger.error({ error }, 'Database restore failed');
    process.exit(1);
  }
}

const command = process.argv[2];
const arg = process.argv[3];

if (command === 'backup') {
  backup(arg);
} else if (command === 'restore') {
  restore(arg);
} else {
  console.log('Usage:');
  console.log('  backup [output-path]     Create database backup');
  console.log('  restore <input-path>     Restore from backup');
  process.exit(1);
}

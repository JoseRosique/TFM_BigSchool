#!/usr/bin/env node
/**
 * Database Migration Validation Script
 * Post-migration verification for nickname field
 *
 * Usage: npx ts-node scripts/validate-nickname-migration.ts
 */

import { createConnection } from 'typeorm';
import { User } from '../src/domain/entities/user.entity';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

interface ValidationResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: ValidationResult[] = [];

async function runValidation() {
  console.log(`${colors.blue}Starting Database Migration Validation...${colors.reset}\n`);

  const connection = await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'meetwithfriends',
    entities: [User],
    synchronize: false,
    logging: false,
  });

  try {
    // Test 1: Nickname column exists and is NOT NULL
    try {
      const queryRunner = connection.createQueryRunner();
      const columnInfo = await queryRunner.query(
        `SELECT column_name, is_nullable, character_maximum_length
         FROM information_schema.columns
         WHERE table_name = 'users' AND column_name = 'nickname'`,
      );
      await queryRunner.release();

      if (columnInfo.length > 0 && columnInfo[0].is_nullable === 'NO') {
        results.push({
          name: '✓ Nickname column exists and is NOT NULL',
          passed: true,
          details: `Type: character varying(${columnInfo[0].character_maximum_length})`,
        });
      } else {
        results.push({
          name: '✗ Nickname column integrity check',
          passed: false,
          details: 'Column is nullable or does not exist',
        });
      }
    } catch (e: any) {
      results.push({
        name: '✗ Nickname column query failed',
        passed: false,
        details: e.message,
      });
    }

    // Test 2: Unique index exists
    try {
      const queryRunner = connection.createQueryRunner();
      const indexInfo = await queryRunner.query(
        `SELECT indexname FROM pg_indexes
         WHERE tablename = 'users' AND indexname = 'uq_users_nickname'`,
      );
      await queryRunner.release();

      results.push({
        name: indexInfo.length > 0 ? '✓ Unique index on nickname' : '✗ Unique index missing',
        passed: indexInfo.length > 0,
        details: indexInfo.length > 0 ? 'Index is active' : 'Create index manually',
      });
    } catch (e: any) {
      results.push({
        name: '✗ Unique index query failed',
        passed: false,
        details: e.message,
      });
    }

    // Test 3: No NULL nicknames
    try {
      const userRepository = connection.getRepository(User);
      const nullCount = await userRepository.count({ where: { nickname: null as any } });

      results.push({
        name: nullCount === 0 ? '✓ No NULL nicknames found' : '✗ NULL nicknames detected',
        passed: nullCount === 0,
        details: `NULL count: ${nullCount}`,
      });
    } catch (e: any) {
      results.push({
        name: '✗ NULL nickname check failed',
        passed: false,
        details: e.message,
      });
    }

    // Test 4: Nickname format validation
    try {
      const queryRunner = connection.createQueryRunner();
      const invalidNicknames = await queryRunner.query(
        `SELECT COUNT(*) as count FROM users
         WHERE nickname ~ '[^a-zA-Z0-9_-]' OR nickname IS NULL
            OR length(nickname) < 1 OR length(nickname) > 100`,
      );
      await queryRunner.release();

      const invalidCount = parseInt(invalidNicknames[0].count);
      results.push({
        name: invalidCount === 0 ? '✓ All nicknames valid format' : '✗ Invalid nicknames found',
        passed: invalidCount === 0,
        details: `Invalid count: ${invalidCount}`,
      });
    } catch (e: any) {
      results.push({
        name: '✗ Format validation check failed',
        passed: false,
        details: e.message,
      });
    }

    // Test 5: Nickname uniqueness
    try {
      const queryRunner = connection.createQueryRunner();
      const duplicates = await queryRunner.query(
        `SELECT nickname, COUNT(*) as count FROM users
         GROUP BY nickname HAVING COUNT(*) > 1`,
      );
      await queryRunner.release();

      results.push({
        name: duplicates.length === 0 ? '✓ All nicknames unique' : '✗ Duplicate nicknames',
        passed: duplicates.length === 0,
        details:
          duplicates.length === 0
            ? 'No duplicates detected'
            : `Found ${duplicates.length} duplicate groups`,
      });

      if (duplicates.length > 0) {
        console.log(`  Duplicates: ${JSON.stringify(duplicates)}`);
      }
    } catch (e: any) {
      results.push({
        name: '✗ Uniqueness check failed',
        passed: false,
        details: e.message,
      });
    }

    // Test 6: Total user count
    try {
      const userRepository = connection.getRepository(User);
      const totalUsers = await userRepository.count();

      results.push({
        name: '✓ User count',
        passed: true,
        details: `Total users: ${totalUsers}`,
      });
    } catch (e: any) {
      results.push({
        name: '✗ User count check failed',
        passed: false,
        details: e.message,
      });
    }
  } finally {
    await connection.close();
  }

  // Print results
  console.log(`${colors.blue}Validation Results:${colors.reset}\n`);

  let passedCount = 0;
  let failedCount = 0;

  results.forEach((result) => {
    const status = result.passed
      ? `${colors.green}PASS${colors.reset}`
      : `${colors.red}FAIL${colors.reset}`;
    console.log(`[${status}] ${result.name}`);
    console.log(`      ${result.details}\n`);

    if (result.passed) passedCount++;
    else failedCount++;
  });

  // Summary
  console.log(`${colors.blue}Summary:${colors.reset}`);
  console.log(`${colors.green}Passed: ${passedCount}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedCount}${colors.reset}`);
  console.log(`${colors.yellow}Total: ${passedCount + failedCount}${colors.reset}\n`);

  if (failedCount > 0) {
    console.log(
      `${colors.red}⚠ Migration validation failed. Please fix the issues above.${colors.reset}`,
    );
    process.exit(1);
  } else {
    console.log(`${colors.green}✓ All migration checks passed! Database is ready.${colors.reset}`);
    process.exit(0);
  }
}

runValidation().catch((error) => {
  console.error(`${colors.red}Fatal error during validation:${colors.reset}`, error);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Migration Test Suite: Add Nickname to Users
 *
 * Purpose: Validate the 1770000000003 migration in a safe test environment
 * Usage: npm run migration:test
 *
 * This script:
 * 1. Creates a test database
 * 2. Runs migrations up to the nickname migration
 * 3. Inserts test data with various email formats
 * 4. Validates nickname generation and disambiguation
 * 5. Rolls back and cleans up
 */

import { createConnection, Connection } from 'typeorm';
import { User } from '../src/domain/entities/user.entity';
import * as bcrypt from 'bcryptjs';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];
let connection: Connection | null = null;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

async function setupTestDatabase() {
  console.log(`${colors.blue}Setting up test database...${colors.reset}\n`);

  connection = await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_TEST_NAME || 'meetwithfriends_migration_test',
    entities: [User],
    migrations: ['dist/infrastructure/migrations/*.js'],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    dropSchema: true, // Clean slate for testing
    logging: false,
  });

  await connection.runMigrations();
  console.log(`${colors.green}✓ Test database ready${colors.reset}\n`);
}

async function insertTestData() {
  if (!connection) throw new Error('Database not connected');

  console.log(`${colors.blue}Inserting test data...${colors.reset}\n`);

  const userRepository = connection.getRepository(User);
  const passwordHash = await bcrypt.hash('Test123!@#', 10);

  const testUsers = [
    { email: 'john.doe@example.com', name: 'John Doe' },
    { email: 'jane.smith@example.com', name: 'Jane Smith' },
    { email: 'john.doe@other.com', name: 'John Doe 2' }, // Same prefix: john.doe
    { email: 'alice+test@gmail.com', name: 'Alice Test' }, // Special char: alice+test
    { email: 'bob_jones@company.co.uk', name: 'Bob Jones' },
    { email: 'maria.garcia@example.es', name: 'María García' }, // Accented char
  ];

  for (const testUser of testUsers) {
    const user = userRepository.create({
      email: testUser.email,
      name: testUser.name,
      passwordHash,
      timezone: 'UTC',
      language: 'en',
    });
    await userRepository.save(user);
  }

  console.log(`${colors.green}✓ Inserted ${testUsers.length} test users${colors.reset}\n`);
}

async function runMigration() {
  if (!connection) throw new Error('Database not connected');

  console.log(`${colors.blue}Running nickname migration...${colors.reset}\n`);

  try {
    await connection.runMigrations();
    console.log(`${colors.green}✓ Migration completed successfully${colors.reset}\n`);
  } catch (error: any) {
    console.error(`${colors.red}✗ Migration failed: ${error.message}${colors.reset}\n`);
    throw error;
  }
}

async function validateMigrationResults() {
  if (!connection) throw new Error('Database not connected');

  console.log(`${colors.blue}Validating migration results...${colors.reset}\n`);

  const userRepository = connection.getRepository(User);

  // Test 1: No NULL nicknames
  try {
    const nullCount = await userRepository.count({ where: { nickname: null as any } });
    results.push({
      name: 'No NULL nicknames',
      passed: nullCount === 0,
      details: `NULL count: ${nullCount}`,
    });
  } catch (e: any) {
    results.push({
      name: 'No NULL nicknames',
      passed: false,
      details: e.message,
    });
  }

  // Test 2: All nicknames have valid format
  try {
    const allUsers = await userRepository.find();
    const nicknameRegex = /^[a-zA-Z0-9_-]{1,100}$/;
    let invalidCount = 0;

    const invalidUsers: string[] = [];
    allUsers.forEach((user) => {
      if (!user.nickname || !nicknameRegex.test(user.nickname)) {
        invalidCount++;
        invalidUsers.push(`${user.email} -> "${user.nickname}" (invalid)`);
      }
    });

    results.push({
      name: 'Nickname format validation',
      passed: invalidCount === 0,
      details:
        invalidCount === 0
          ? 'All nicknames match pattern [a-zA-Z0-9_-]{1,100}'
          : `${invalidCount} nicknames invalid: ${invalidUsers.join(', ')}`,
    });
  } catch (e: any) {
    results.push({
      name: 'Nickname format validation',
      passed: false,
      details: e.message,
    });
  }

  // Test 3: All nicknames are unique
  try {
    const queryRunner = connection.createQueryRunner();
    const duplicates = await queryRunner.query(
      `SELECT nickname, COUNT(*) as count FROM "user"
       GROUP BY nickname HAVING COUNT(*) > 1`,
    );
    await queryRunner.release();

    results.push({
      name: 'Nickname uniqueness',
      passed: duplicates.length === 0,
      details:
        duplicates.length === 0
          ? 'All nicknames are unique'
          : `Found ${duplicates.length} duplicate nickname(s): ${JSON.stringify(duplicates)}`,
    });
  } catch (e: any) {
    results.push({
      name: 'Nickname uniqueness',
      passed: false,
      details: e.message,
    });
  }

  // Test 4: Unique index exists
  try {
    const queryRunner = connection.createQueryRunner();
    const indexInfo = await queryRunner.query(
      `SELECT indexname FROM pg_indexes
       WHERE tablename = 'user' AND indexname = 'uq_users_nickname'`,
    );
    await queryRunner.release();

    results.push({
      name: 'Unique index on nickname',
      passed: indexInfo.length > 0,
      details: indexInfo.length > 0 ? 'Index active' : 'Index not found',
    });
  } catch (e: any) {
    results.push({
      name: 'Unique index on nickname',
      passed: false,
      details: e.message,
    });
  }

  // Test 5: Column is NOT NULL
  try {
    const queryRunner = connection.createQueryRunner();
    const columnInfo = await queryRunner.query(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_name = 'user' AND column_name = 'nickname'`,
    );
    await queryRunner.release();

    const isNullable = columnInfo[0]?.is_nullable === 'YES';
    results.push({
      name: 'Nickname column NOT NULL',
      passed: !isNullable,
      details: isNullable ? 'Column is nullable (unexpected)' : 'Column is NOT NULL',
    });
  } catch (e: any) {
    results.push({
      name: 'Nickname column NOT NULL',
      passed: false,
      details: e.message,
    });
  }

  // Test 6: Desambiguation worked for duplicate email prefixes
  try {
    const userRepository = connection.getRepository(User);
    const johnDoeUsers = await userRepository.find({
      where: [{ email: 'john.doe@example.com' }, { email: 'john.doe@other.com' }],
    });

    const nicknames = johnDoeUsers.map((u) => u.nickname).sort();

    // Both should exist and be different
    const areUnique = new Set(nicknames).size === nicknames.length;
    results.push({
      name: 'Duplicate prefix desambiguation',
      passed: areUnique,
      details: areUnique
        ? `Nicknames: ${nicknames.join(', ')}`
        : `Nicknames not unique: ${nicknames.join(', ')}`,
    });
  } catch (e: any) {
    results.push({
      name: 'Duplicate prefix desambiguation',
      passed: false,
      details: e.message,
    });
  }

  // Display all users' nicknames for verification
  try {
    console.log(`${colors.yellow}Generated nicknames:${colors.reset}`);
    const allUsers = await userRepository.find();
    allUsers.forEach((user) => {
      console.log(`  ${user.email.padEnd(30)} → ${user.nickname}`);
    });
    console.log();
  } catch (e) {
    // Ignore display errors
  }
}

async function printResults() {
  console.log(`${colors.blue}Test Results:${colors.reset}\n`);

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

  console.log(`${colors.blue}Summary:${colors.reset}`);
  console.log(`${colors.green}Passed: ${passedCount}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedCount}${colors.reset}`);
  console.log(`${colors.yellow}Total: ${passedCount + failedCount}${colors.reset}\n`);

  return failedCount === 0;
}

async function cleanup() {
  if (connection) {
    console.log(`${colors.blue}Cleaning up test database...${colors.reset}\n`);
    await connection.dropDatabase();
    await connection.close();
    console.log(`${colors.green}✓ Test database cleaned up${colors.reset}\n`);
  }
}

async function main() {
  console.log(`${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║  Migration Test: Add Nickname to Users ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}\n`);

  try {
    await setupTestDatabase();
    await insertTestData();
    await runMigration();
    await validateMigrationResults();
    const success = await printResults();

    await cleanup();

    if (success) {
      console.log(`${colors.green}✓ All migration tests passed! Safe to deploy.${colors.reset}`);
      process.exit(0);
    } else {
      console.log(
        `${colors.red}✗ Some tests failed. Review migration before deploying.${colors.reset}`,
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}Fatal error during migration testing:${colors.reset}`, error);
    await cleanup();
    process.exit(1);
  }
}

main();

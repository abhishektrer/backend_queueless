#!/usr/bin/env node

/**
 * Environment Variable Verification Script
 * Run this on Render to diagnose missing/malformed env vars
 * Usage: node verify-env.js
 */

import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 ENVIRONMENT VARIABLE VERIFICATION\n');
console.log('=' .repeat(60));

const checks = [
  {
    name: 'JWT_SECRET',
    required: true,
    validate: (val) => val && val.length >= 32,
    error: 'Must be at least 32 characters long'
  },
  {
    name: 'JWT_EXPIRE',
    required: true,
    validate: (val) => val && /^\d+[dhms]$/.test(val),
    error: 'Must be in format like "7d", "24h", "60m"'
  },
  {
    name: 'ADMIN_REGISTRATION_CODE',
    required: true,
    validate: (val) => val && val.length > 0,
    error: 'Cannot be empty'
  },
  {
    name: 'MONGODB_URI',
    required: true,
    validate: (val) => val && val.startsWith('mongodb'),
    error: 'Must start with "mongodb://" or "mongodb+srv://"'
  },
  {
    name: 'FIREBASE_PROJECT_ID',
    required: true,
    validate: (val) => val && val.length > 0,
    error: 'Cannot be empty'
  },
  {
    name: 'FIREBASE_PRIVATE_KEY',
    required: true,
    validate: (val) => val && val.includes('BEGIN PRIVATE KEY'),
    error: 'Must contain "BEGIN PRIVATE KEY"'
  },
  {
    name: 'FIREBASE_CLIENT_EMAIL',
    required: true,
    validate: (val) => val && val.includes('@') && val.includes('.iam.gserviceaccount.com'),
    error: 'Must be a valid Firebase service account email'
  },
  {
    name: 'GROQ_API_KEY',
    required: false,
    validate: (val) => !val || val.startsWith('gsk_'),
    error: 'Should start with "gsk_"'
  },
  {
    name: 'GROQ_MODEL',
    required: false,
    validate: (val) => !val || val.length > 0,
    error: 'If set, cannot be empty'
  },
  {
    name: 'RESEND_API_KEY',
    required: false,
    validate: (val) => !val || val.startsWith('re_'),
    error: 'Should start with "re_"'
  },
  {
    name: 'ONESIGNAL_APP_ID',
    required: false,
    validate: (val) => !val || /^[a-f0-9-]{36}$/.test(val),
    error: 'Should be a UUID format'
  },
  {
    name: 'ONESIGNAL_REST_API_KEY',
    required: false,
    validate: (val) => !val || val.startsWith('os_'),
    error: 'Should start with "os_"'
  },
  {
    name: 'FRONTEND_URL',
    required: true,
    validate: (val) => val && val.startsWith('http'),
    error: 'Must start with "http://" or "https://"'
  },
  {
    name: 'NODE_ENV',
    required: false,
    validate: (val) => !val || ['development', 'production', 'test'].includes(val),
    error: 'Should be "development", "production", or "test"'
  },
  {
    name: 'PORT',
    required: false,
    validate: (val) => !val || !isNaN(parseInt(val)),
    error: 'Must be a number'
  }
];

let errorCount = 0;
let warningCount = 0;

checks.forEach(check => {
  const value = process.env[check.name];
  const isSet = value !== undefined && value !== '';
  const isValid = check.validate(value);
  
  let status = '✅';
  let message = 'OK';
  
  if (!isSet) {
    if (check.required) {
      status = '❌';
      message = 'MISSING (Required)';
      errorCount++;
    } else {
      status = '⚠️';
      message = 'NOT SET (Optional)';
      warningCount++;
    }
  } else if (!isValid) {
    status = '❌';
    message = `INVALID: ${check.error}`;
    errorCount++;
  } else {
    // Mask sensitive values
    if (check.name.includes('SECRET') || check.name.includes('KEY') || check.name.includes('PASSWORD')) {
      message = `SET (${value.substring(0, 8)}...${value.substring(value.length - 4)})`;
    } else if (check.name === 'FIREBASE_PRIVATE_KEY') {
      message = `SET (${value.length} chars)`;
    } else {
      message = `SET (${value})`;
    }
  }
  
  console.log(`${status} ${check.name.padEnd(30)} ${message}`);
});

console.log('=' .repeat(60));
console.log(`\n📊 SUMMARY:`);
console.log(`   ✅ Valid: ${checks.length - errorCount - warningCount}`);
console.log(`   ❌ Errors: ${errorCount}`);
console.log(`   ⚠️  Warnings: ${warningCount}`);

if (errorCount > 0) {
  console.log('\n❌ CRITICAL: Fix errors before deploying!');
  process.exit(1);
} else if (warningCount > 0) {
  console.log('\n⚠️  Some optional features may not work without these variables.');
  console.log('   But the server should start successfully.');
  process.exit(0);
} else {
  console.log('\n✅ All environment variables are correctly configured!');
  process.exit(0);
}

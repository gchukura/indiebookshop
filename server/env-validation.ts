/**
 * Environment variable validation
 * Validates required environment variables on startup
 */

interface EnvConfig {
  NODE_ENV?: string;
  GOOGLE_SHEETS_ID?: string;
  GOOGLE_SERVICE_ACCOUNT_CREDENTIALS?: string;
  REFRESH_API_KEY?: string;
  MAPBOX_ACCESS_TOKEN?: string;
  SENDGRID_API_KEY?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates environment variables
 * @returns ValidationResult with validation status and any errors/warnings
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required in production
  const requiredInProduction = [
    'GOOGLE_SHEETS_ID',
    'GOOGLE_SERVICE_ACCOUNT_CREDENTIALS',
  ];

  // Required for specific features
  if (process.env.USE_SAMPLE_DATA !== 'true') {
    if (!process.env.GOOGLE_SHEETS_ID) {
      errors.push('GOOGLE_SHEETS_ID is required when USE_SAMPLE_DATA is not "true"');
    }
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
      errors.push('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS is required when USE_SAMPLE_DATA is not "true"');
    }
  }

  // Validate GOOGLE_SERVICE_ACCOUNT_CREDENTIALS format if present
  if (process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
      if (!credentials.client_email || !credentials.private_key) {
        errors.push('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS is missing required fields (client_email or private_key)');
      }
    } catch (e) {
      errors.push('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS must be valid JSON');
    }
  }

  // Warn about missing optional but recommended variables
  if (!process.env.REFRESH_API_KEY) {
    warnings.push('REFRESH_API_KEY is not set - admin refresh endpoints will be disabled');
  }

  if (!process.env.MAPBOX_ACCESS_TOKEN) {
    warnings.push('MAPBOX_ACCESS_TOKEN is not set - maps will not be displayed');
  }

  if (!process.env.SENDGRID_API_KEY) {
    warnings.push('SENDGRID_API_KEY is not set - email notifications will not work');
  }

  // Validate NODE_ENV
  const validNodeEnvs = ['development', 'production', 'test'];
  if (process.env.NODE_ENV && !validNodeEnvs.includes(process.env.NODE_ENV)) {
    warnings.push(`NODE_ENV should be one of: ${validNodeEnvs.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates and logs environment variables, exits if critical errors
 */
export function validateAndLogEnvironment(): void {
  const result = validateEnvironment();

  if (result.errors.length > 0) {
    console.error('❌ Environment validation failed:');
    result.errors.forEach((error) => {
      console.error(`   - ${error}`);
    });
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    console.error('See .env.example for reference.');
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment validation warnings:');
    result.warnings.forEach((warning) => {
      console.warn(`   - ${warning}`);
    });
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('✅ Environment variables validated successfully');
  }
}


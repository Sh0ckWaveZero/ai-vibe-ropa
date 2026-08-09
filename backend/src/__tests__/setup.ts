import dotenv from 'dotenv';

// Runs inside each test worker, before that worker imports any test file —
// must happen before anything imports src/config/env.ts, which validates
// process.env at import time.
// The checked-in test environment must win over developer shell and CI values.
dotenv.config({ path: '.env.test', override: true, quiet: true });

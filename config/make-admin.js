const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Setup environment and paths
const envPath = path.resolve(__dirname, '..', '.env');
require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });
const connect = require('./connect');

// Helper to generate secure random hex string
function generateSecureSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

// Function to check if MeiliSearch is running
async function checkMeiliSearch(host) {
  try {
    const response = await fetch(`${host}/health`, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function updateEnvAndCheckSearch() {
  if (!fs.existsSync(envPath)) {
    console.orange('.env file not found.');
    return;
  }

  let envContent = fs.readFileSync(envPath, 'utf8');

  // Helper function to replace/add keys
  const replaceOrAddKey = (key, newValue) => {
    const regex = new RegExp(`^#?\\s*${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${newValue}`);
    } else {
      envContent += `\n${key}=${newValue}`;
    }
  };

  // 1. Rotate default credentials if they are still at default values
  const defaultSecrets = {
    CREDS_KEY: 'f34be427ebb29de8d88c107a71546019685ed8b241d8f2ed00c3df97ad2566f0',
    CREDS_IV: 'e2341419ec3dd3d19b13a1a87fafcbfb',
    JWT_SECRET: '16f8c0ef4a5d391b26034086c628469d3f9f497f08163ab9b40137092f2909ef',
    JWT_REFRESH_SECRET: 'eaa5191f2914e30b9387fd84e254e4ba6fc51b4654968a9b0803b456a54b8418',
  };

  let updatedAny = false;

  for (const [key, defaultValue] of Object.entries(defaultSecrets)) {
    const regex = new RegExp(`^\\s*${key}=(.*)$`, 'm');
    const match = envContent.match(regex);
    if (match && match[1].trim() === defaultValue) {
      const length = key === 'CREDS_IV' ? 16 : 32;
      const newSecret = generateSecureSecret(length);
      replaceOrAddKey(key, newSecret);
      console.green(`Generated new secure secret for ${key}`);
      updatedAny = true;
    }
  }

  // 2. Check if MeiliSearch is running, otherwise set SEARCH=false to avoid console spam
  const searchRegex = /^\s*SEARCH=(.*)$/m;
  const searchMatch = envContent.match(searchRegex);
  const meiliHostRegex = /^\s*MEILI_HOST=(.*)$/m;
  const meiliHostMatch = envContent.match(meiliHostRegex);
  const meiliHost = (meiliHostMatch && meiliHostMatch[1].trim()) || 'http://127.0.0.1:7700';

  if (searchMatch && searchMatch[1].trim() === 'true') {
    console.orange(`Checking if MeiliSearch is reachable at ${meiliHost}...`);
    const isMeiliRunning = await checkMeiliSearch(meiliHost);
    if (!isMeiliRunning) {
      console.orange('MeiliSearch is not running or unreachable. Disabling SEARCH to avoid console warnings/errors.');
      replaceOrAddKey('SEARCH', 'false');
      updatedAny = true;
    } else {
      console.green('MeiliSearch is running and reachable.');
    }
  }

  if (updatedAny) {
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.green('Successfully updated .env file configuration.');
  } else {
    console.orange('No configuration updates needed for .env.');
  }
}

async function setAdminRole(email, targetRole = 'ADMIN') {
  // Connect to the DB
  await connect();

  const { User, SystemGrant } = require('@librechat/data-schemas').createModels(mongoose);
  const { registerUser } = require('~/server/services/AuthService');
  const { PrincipalType } = require('librechat-data-provider');

  const user = await User.findOne({ email });
  if (user) {
    console.purple(`Found existing user in database: ${user.name} (${user.email})`);
    if (user.role === targetRole) {
      console.green(`User ${email} is already role ${targetRole}.`);
    } else {
      user.role = targetRole;
      await user.save();
      console.green(`Successfully updated role for ${email} to ${targetRole}!`);
    }
  } else {
    console.orange(`User with email "${email}" was not found in the database.`);
    console.orange(`Creating a new user with email "${email}" and role ${targetRole}...`);

    // Generate a secure temporary password
    const tempPassword = crypto.randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + '1aA!';
    const defaultName = email.split('@')[0];
    const cleanUsername = defaultName.replace(/[^a-zA-Z0-9]/g, '');

    const userPayload = {
      email,
      password: tempPassword,
      confirm_password: tempPassword,
      name: defaultName,
      username: cleanUsername.length >= 2 ? cleanUsername : 'adminuser',
    };

    const result = await registerUser(userPayload, { emailVerified: true });
    if (result.status !== 200) {
      console.red(`Failed to register user: ${result.message}`);
      process.exit(1);
    }

    // Retrieve the newly created user and update their role
    const newUser = await User.findOne({ email });
    if (!newUser) {
      console.red('Failed to locate the newly registered user in the database.');
      process.exit(1);
    }

    newUser.role = targetRole;
    await newUser.save();

    console.green(`\n========================================`);
    console.green(`New account registered successfully!`);
    console.green(`Email:    ${email}`);
    console.green(`Password: ${tempPassword}`);
    console.green(`Role:     ${targetRole}`);
    console.green(`Please log in using these credentials.`);
    console.green(`========================================\n`);
  }

  // If role is EDITOR, check/create SystemGrant for ACCESS_ADMIN capability
  if (targetRole === 'EDITOR') {
    const capability = 'access:admin';
    const hasGrant = await SystemGrant.findOne({
      principalType: PrincipalType.ROLE,
      principalId: 'EDITOR',
      capability,
    });
    if (!hasGrant) {
      await SystemGrant.create({
        principalType: PrincipalType.ROLE,
        principalId: 'EDITOR',
        capability,
        grantedAt: new Date(),
      });
      console.green('Successfully granted access:admin capability to EDITOR role in database system grants.');
    } else {
      console.green('EDITOR role already holds the access:admin capability.');
    }
  }
}

(async () => {
  try {
    console.purple('--- LibreChat Setup & Admin Script ---');
    
    // 1. Check/update secrets and search settings in .env
    await updateEnvAndCheckSearch();
    
    // 2. Set user role
    const email = process.argv[2] || 'abdelrahmanabuzaid311@gmail.com';
    const targetRole = (process.argv[3] || 'ADMIN').toUpperCase();
    await setAdminRole(email, targetRole);
    
    console.purple('---------------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('Error running script:', error);
    process.exit(1);
  }
})();

import { SeedGenerator } from '../utils/seedGenerator';
import fs from 'fs';
import path from 'path';

async function generateProjectSeed() {
  try {
    console.log('🌱 Generating project seed...');
    
    const seedGenerator = SeedGenerator.getInstance();
    const seedData = seedGenerator.generateSeed();
    
    console.log('📊 Seed Data Generated:');
    console.log(`   Seed: ${seedData.seed}`);
    console.log(`   Project Start Time: ${seedData.projectStartTime}`);
    console.log(`   Remote URL: ${seedData.remoteUrl}`);
    console.log(`   First Commit Epoch: ${seedData.firstCommitEpoch}`);
    console.log(`   Coefficients: A=${seedData.coefficients.A}, B=${seedData.coefficients.B}, C=${seedData.coefficients.C}`);
    
    // Update .env file
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    let envContent = '';
    
    // Read existing .env or use .env.example
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    } else if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, 'utf8');
    }
    
    // Update PROJECT_SEED and PROJECT_START_TIME
    envContent = envContent
      .replace(/PROJECT_SEED=.*/, `PROJECT_SEED=${seedData.seed}`)
      .replace(/PROJECT_START_TIME=.*/, `PROJECT_START_TIME=${seedData.projectStartTime}`);
    
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Seed data written to .env file');
    console.log('💡 Priority Score Formula:');
    console.log(`   priority_score = base + (signup_latency_ms % ${seedData.coefficients.A}) + (account_age_days % ${seedData.coefficients.B}) - (rapid_actions % ${seedData.coefficients.C})`);
    
  } catch (error) {
    console.error('❌ Failed to generate seed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateProjectSeed();
}
import crypto from 'crypto';
import { execSync } from 'child_process';

export interface SeedData {
  seed: string;
  coefficients: {
    A: number;
    B: number;
    C: number;
  };
  projectStartTime: string;
  remoteUrl: string;
  firstCommitEpoch: string;
}

export class SeedGenerator {
  private static instance: SeedGenerator;
  private seedData: SeedData | null = null;

  private constructor() {}

  public static getInstance(): SeedGenerator {
    if (!SeedGenerator.instance) {
      SeedGenerator.instance = new SeedGenerator();
    }
    return SeedGenerator.instance;
  }

  public generateSeed(startTime?: string): SeedData {
    if (this.seedData) {
      return this.seedData;
    }

    try {
      // Get project start time (YYYYMMDDHHmm format)
      const projectStartTime = startTime || this.formatCurrentTime();
      
      // Get GitHub remote URL
      let remoteUrl: string;
      try {
        remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
      } catch (error) {
        // Fallback if git not initialized yet
        remoteUrl = 'local-development';
      }

      // Get first commit epoch
      let firstCommitEpoch: string;
      try {
        firstCommitEpoch = execSync('git log --reverse --format=%ct | head -n1', { encoding: 'utf8' }).trim();
      } catch (error) {
        // Fallback if no commits yet
        firstCommitEpoch = Math.floor(Date.now() / 1000).toString();
      }

      // Combine data
      const rawData = `${remoteUrl}|${firstCommitEpoch}|${projectStartTime}`;
      
      // Generate SHA256 hash and take first 12 characters
      const hash = crypto.createHash('sha256').update(rawData).digest('hex');
      const seed = hash.substring(0, 12);

      // Generate coefficients based on seed
      const coefficients = this.generateCoefficients(seed);

      this.seedData = {
        seed,
        coefficients,
        projectStartTime,
        remoteUrl,
        firstCommitEpoch
      };

      return this.seedData;
    } catch (error) {
      throw new Error(`Failed to generate seed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private formatCurrentTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}`;
  }

  private generateCoefficients(seed: string): { A: number; B: number; C: number } {
    const A = 7 + (parseInt(seed.substring(0, 2), 16) % 5);
    const B = 13 + (parseInt(seed.substring(2, 4), 16) % 7);
    const C = 3 + (parseInt(seed.substring(4, 6), 16) % 3);
    
    return { A, B, C };
  }

  public calculatePriorityScore(
    base: number,
    signupLatencyMs: number,
    accountAgeDays: number,
    rapidActions: number = 0
  ): number {
    if (!this.seedData) {
      throw new Error('Seed not generated. Call generateSeed() first.');
    }

    const { A, B, C } = this.seedData.coefficients;
    
    return base + 
           (signupLatencyMs % A) + 
           (accountAgeDays % B) - 
           (rapidActions % C);
  }

  public getSeedData(): SeedData | null {
    return this.seedData;
  }

  public reset(): void {
    this.seedData = null;
  }
}
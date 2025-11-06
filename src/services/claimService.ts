import { PrismaClient } from '@prisma/client';
import { SeedGenerator } from '../utils/seedGenerator';
import { AppErrorClass } from '../middleware/errorHandler';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface ClaimResult {
  claim: {
    id: string;
    claimCode: string;
    status: string;
    claimedAt: Date;
    expiresAt: Date;
  };
  drop: {
    id: string;
    title: string;
    phase: string;
  };
}

export class ClaimService {
  /**
   * Claim a drop (purchase/reserve an item)
   * Only works during claim window and for eligible users
   */
  public static async claimDrop(userId: string, dropId: string): Promise<ClaimResult> {
    return await prisma.$transaction(async (tx) => {
      // Get drop information
      const drop = await tx.drop.findUnique({
        where: { id: dropId },
        include: {
          claims: true,
          waitlistEntries: {
            orderBy: { priorityScore: 'desc' }
          }
        }
      });

      if (!drop) {
        throw AppErrorClass.notFound('Drop not found', 'DROP_NOT_FOUND');
      }

      if (!drop.isActive) {
        throw AppErrorClass.conflict('Drop is not active', 'DROP_NOT_ACTIVE');
      }

      const now = new Date();

      // Check if we're in claim window
      if (now < drop.claimWindowStart) {
        throw AppErrorClass.conflict('Claim window has not started yet', 'CLAIM_WINDOW_NOT_STARTED');
      }

      if (now >= drop.claimWindowEnd) {
        throw AppErrorClass.conflict('Claim window has ended', 'CLAIM_WINDOW_ENDED');
      }

      // Check if stock is available
      if (drop.claimedStock >= drop.totalStock) {
        throw AppErrorClass.conflict('Drop is sold out', 'DROP_SOLD_OUT');
      }

      // Check if user already claimed (idempotency)
      const existingClaim = await tx.claim.findUnique({
        where: {
          userId_dropId: {
            userId,
            dropId
          }
        }
      });

      if (existingClaim) {
        // Return existing claim (idempotent)
        return {
          claim: {
            id: existingClaim.id,
            claimCode: existingClaim.claimCode,
            status: existingClaim.status,
            claimedAt: existingClaim.claimedAt,
            expiresAt: existingClaim.expiresAt
          },
          drop: {
            id: drop.id,
            title: drop.title,
            phase: 'claiming'
          }
        };
      }

      // Check if user was in waitlist and is eligible to claim
      const userWaitlistEntry = await tx.waitlistEntry.findUnique({
        where: {
          userId_dropId: {
            userId,
            dropId
          }
        }
      });

      if (!userWaitlistEntry) {
        throw AppErrorClass.forbidden('You must be in the waitlist to claim this drop', 'NOT_IN_WAITLIST');
      }

      // Get user's position in waitlist (rank by priority score)
      const higherPriorityUsers = await tx.waitlistEntry.count({
        where: {
          dropId,
          priorityScore: {
            gt: userWaitlistEntry.priorityScore || 0
          }
        }
      });

      const userPosition = higherPriorityUsers + 1;
      const availableStock = drop.totalStock - drop.claimedStock;

      // Check if user is eligible based on position and available stock
      if (userPosition > availableStock) {
        throw AppErrorClass.forbidden(
          `You are not eligible to claim. Position: ${userPosition}, Available stock: ${availableStock}`,
          'NOT_ELIGIBLE',
          { position: userPosition, availableStock }
        );
      }

      // Generate unique claim code
      const claimCode = this.generateClaimCode(dropId, userId);

      // Set claim expiration (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create claim
      const claim = await tx.claim.create({
        data: {
          userId,
          dropId,
          claimCode,
          status: 'PENDING',
          expiresAt
        }
      });

      // Update drop claimed stock
      await tx.drop.update({
        where: { id: dropId },
        data: {
          claimedStock: {
            increment: 1
          }
        }
      });

      // Remove user from waitlist (they've successfully claimed)
      await tx.waitlistEntry.delete({
        where: {
          userId_dropId: {
            userId,
            dropId
          }
        }
      });

      return {
        claim: {
          id: claim.id,
          claimCode: claim.claimCode,
          status: claim.status,
          claimedAt: claim.claimedAt,
          expiresAt: claim.expiresAt
        },
        drop: {
          id: drop.id,
          title: drop.title,
          phase: 'claiming'
        }
      };
    });
  }

  /**
   * Get user's claim status for a specific drop
   */
  public static async getClaimStatus(userId: string, dropId: string) {
    const claim = await prisma.claim.findUnique({
      where: {
        userId_dropId: {
          userId,
          dropId
        }
      },
      include: {
        drop: {
          select: {
            id: true,
            title: true,
            claimWindowStart: true,
            claimWindowEnd: true
          }
        }
      }
    });

    if (!claim) {
      return {
        hasClaim: false,
        message: 'No claim found for this drop'
      };
    }

    const now = new Date();
    const isExpired = now > claim.expiresAt;

    return {
      hasClaim: true,
      claim: {
        id: claim.id,
        claimCode: claim.claimCode,
        status: isExpired ? 'EXPIRED' : claim.status,
        claimedAt: claim.claimedAt,
        expiresAt: claim.expiresAt,
        isExpired
      },
      drop: {
        id: claim.drop.id,
        title: claim.drop.title,
        claimWindowStart: claim.drop.claimWindowStart,
        claimWindowEnd: claim.drop.claimWindowEnd
      }
    };
  }

  /**
   * Complete a claim (mark as COMPLETED)
   * This would typically be called after payment processing
   */
  public static async completeClaim(userId: string, dropId: string) {
    return await prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findUnique({
        where: {
          userId_dropId: {
            userId,
            dropId
          }
        }
      });

      if (!claim) {
        throw new Error('Claim not found');
      }

      if (claim.status === 'COMPLETED') {
        return claim; // Already completed (idempotent)
      }

      if (claim.status === 'EXPIRED') {
        throw new Error('Claim has expired');
      }

      const now = new Date();
      if (now > claim.expiresAt) {
        // Mark as expired
        await tx.claim.update({
          where: { id: claim.id },
          data: { status: 'EXPIRED' }
        });
        throw new Error('Claim has expired');
      }

      // Mark as completed
      const updatedClaim = await tx.claim.update({
        where: { id: claim.id },
        data: { status: 'COMPLETED' }
      });

      return updatedClaim;
    });
  }

  /**
   * Generate a unique claim code using seed-based approach
   */
  private static generateClaimCode(dropId: string, userId: string): string {
    const seedGenerator = SeedGenerator.getInstance();
    const seedData = seedGenerator.getSeedData();
    
    if (!seedData) {
      // Fallback to regular crypto if seed not available
      return 'CLAIM-' + crypto.randomBytes(8).toString('hex').toUpperCase();
    }

    // Use seed + dropId + userId for deterministic but unique code
    const input = `${seedData.seed}-${dropId}-${userId}-${Date.now()}`;
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    
    // Take first 12 characters and format nicely
    const code = hash.substring(0, 12).toUpperCase();
    return `CLAIM-${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8)}`;
  }

  /**
   * Get all claims for a user
   */
  public static async getUserClaims(userId: string) {
    const claims = await prisma.claim.findMany({
      where: { userId },
      include: {
        drop: {
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            claimWindowStart: true,
            claimWindowEnd: true
          }
        }
      },
      orderBy: { claimedAt: 'desc' }
    });

    return claims.map(claim => {
      const now = new Date();
      const isExpired = now > claim.expiresAt;

      return {
        id: claim.id,
        claimCode: claim.claimCode,
        status: isExpired ? 'EXPIRED' : claim.status,
        claimedAt: claim.claimedAt,
        expiresAt: claim.expiresAt,
        isExpired,
        drop: claim.drop
      };
    });
  }

  /**
   * Clean up expired claims (should be run periodically)
   */
  public static async cleanupExpiredClaims() {
    const now = new Date();
    
    const expiredClaims = await prisma.claim.updateMany({
      where: {
        expiresAt: {
          lt: now
        },
        status: 'PENDING'
      },
      data: {
        status: 'EXPIRED'
      }
    });

    // Optionally, we could return the stock to the drop
    // This would require more complex logic to handle race conditions
    
    return {
      updatedCount: expiredClaims.count,
      message: `${expiredClaims.count} expired claims updated`
    };
  }
}
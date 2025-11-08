import { PrismaClient } from '@prisma/client';
import { SeedGenerator } from '../utils/seedGenerator';

const prisma = new PrismaClient();

/**
 * Waitlist Service
 * Handles waitlist business logic with priority scoring and idempotency
 */
export class WaitlistService {
  
  /**
   * Calculate priority score for waitlist positioning
   * Formula: base + (signup_latency_ms % A) + (account_age_days % B) - (rapid_actions % C)
   */
  public static async calculatePriorityScore(
    userId: string, 
    dropId: string, 
    joinedAt: Date
  ): Promise<number> {
    try {
      // Get user account creation date
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get drop start date for latency calculation
      const drop = await prisma.drop.findUnique({
        where: { id: dropId },
        select: { startDate: true }
      });

      if (!drop) {
        throw new Error('Drop not found');
      }

      // Get seed data and coefficients
      const seedGenerator = SeedGenerator.getInstance();
      const seedData = seedGenerator.getSeedData();
      if (!seedData) {
        throw new Error('Seed not generated. Please contact administrator.');
      }

      // Calculate components
      const signupLatencyMs = Math.max(0, joinedAt.getTime() - drop.startDate.getTime());
      const accountAgeDays = Math.floor((joinedAt.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      // Count rapid actions (joins in last hour)
      const oneHourAgo = new Date(joinedAt.getTime() - 60 * 60 * 1000);
      const rapidActions = await prisma.waitlistEntry.count({
        where: {
          userId,
          joinedAt: {
            gte: oneHourAgo,
            lte: joinedAt
          }
        }
      });

      // Calculate priority score using SeedGenerator
      const base = 1000; // Base score
      const priorityScore = seedGenerator.calculatePriorityScore(
        base,
        signupLatencyMs,
        accountAgeDays,
        rapidActions
      );

      return Math.max(0, priorityScore); // Ensure non-negative

    } catch (error) {
      console.error('Error calculating priority score:', error);
      return 1000; // Default score on error
    }
  }

  /**
   * Join waitlist with idempotency
   * Returns existing entry if already joined
   */
  public static async joinWaitlist(userId: string, dropId: string): Promise<{
    entry: any;
    isNew: boolean;
    message: string;
  }> {
    return await prisma.$transaction(async (tx) => {
      // Check if drop exists and is in correct state
      const drop = await tx.drop.findUnique({
        where: { id: dropId },
        select: {
          id: true,
          title: true,
          startDate: true,
          claimWindowStart: true,
          endDate: true,
          isActive: true,
          totalStock: true,
          claimedStock: true
        }
      });

      if (!drop) {
        throw new Error('Drop not found');
      }

      if (!drop.isActive) {
        throw new Error('Drop is not active');
      }

      const now = new Date();

      // Check if drop is in correct phase for joining waitlist
      if (now < drop.startDate) {
        throw new Error('Drop has not started yet');
      }

      if (now >= drop.claimWindowStart) {
        throw new Error('Waitlist phase has ended, claim window is active');
      }

      if (now >= drop.endDate) {
        throw new Error('Drop has ended');
      }

      // Check if stock is available
      if (drop.claimedStock >= drop.totalStock) {
        throw new Error('Drop is sold out');
      }

      // Check if user already in waitlist (idempotency)
      const existingEntry = await tx.waitlistEntry.findUnique({
        where: {
          userId_dropId: {
            userId,
            dropId
          }
        }
      });

      if (existingEntry) {
        return {
          entry: existingEntry,
          isNew: false,
          message: 'Already in waitlist'
        };
      }

      // Calculate priority score
      const joinedAt = new Date();
      const priorityScore = await this.calculatePriorityScore(userId, dropId, joinedAt);

      // Create new waitlist entry
      const newEntry = await tx.waitlistEntry.create({
        data: {
          userId,
          dropId,
          joinedAt,
          priorityScore
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              surname: true,
              email: true
            }
          },
          drop: {
            select: {
              id: true,
              title: true,
              startDate: true,
              claimWindowStart: true
            }
          }
        }
      });

      return {
        entry: newEntry,
        isNew: true,
        message: 'Successfully joined waitlist'
      };
    });
  }

  /**
   * Leave waitlist with idempotency
   * Returns success even if not in waitlist
   */
  public static async leaveWaitlist(userId: string, dropId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return await prisma.$transaction(async (tx) => {
      // Check if drop exists
      const drop = await tx.drop.findUnique({
        where: { id: dropId },
        select: { id: true, title: true, claimWindowStart: true }
      });

      if (!drop) {
        throw new Error('Drop not found');
      }

      // Check if still in waitlist phase
      const now = new Date();
      if (now >= drop.claimWindowStart) {
        throw new Error('Cannot leave waitlist after claim window has started');
      }

      // Find existing entry
      const existingEntry = await tx.waitlistEntry.findUnique({
        where: {
          userId_dropId: {
            userId,
            dropId
          }
        }
      });

      if (!existingEntry) {
        return {
          success: true,
          message: 'Not in waitlist (already removed or never joined)'
        };
      }

      // Remove from waitlist
      await tx.waitlistEntry.delete({
        where: {
          userId_dropId: {
            userId,
            dropId
          }
        }
      });

      return {
        success: true,
        message: 'Successfully left waitlist'
      };
    });
  }

  /**
   * Find waitlist entry for user and drop
   */
  public static async findWaitlistEntry(userId: string, dropId: string) {
    return await prisma.waitlistEntry.findUnique({
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
  }

  /**
   * Get user's position in waitlist
   */
  public static async getWaitlistPosition(userId: string, dropId: string): Promise<number | null> {
    const userEntry = await prisma.waitlistEntry.findUnique({
      where: {
        userId_dropId: {
          userId,
          dropId
        }
      }
    });

    if (!userEntry) return null;

    const userPriorityScore = userEntry.priorityScore || 0;

    const position = await prisma.waitlistEntry.count({
      where: {
        dropId,
        OR: [
          { priorityScore: { gt: userPriorityScore } },
          {
            priorityScore: userPriorityScore,
            joinedAt: { lt: userEntry.joinedAt }
          }
        ]
      }
    });

    return position + 1;
  }

  /**
   * Get waitlist for a drop (admin only)
   */
  public static async getWaitlist(dropId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      prisma.waitlistEntry.findMany({
        where: { dropId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              surname: true,
              email: true,
              createdAt: true
            }
          }
        },
        orderBy: [
          { priorityScore: 'desc' }, // Higher priority first
          { joinedAt: 'asc' }        // Earlier joins first for same priority
        ],
        skip,
        take: limit
      }),
      prisma.waitlistEntry.count({
        where: { dropId }
      })
    ]);

    return {
      entries: entries.map((entry, index) => ({
        ...entry,
        position: skip + index + 1 // Waitlist position
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get all user's waitlist entries with drop details and positions
   */
  public static async getUserWaitlists(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    // Get user's waitlist entries with drop details
    const [entries, total] = await Promise.all([
      prisma.waitlistEntry.findMany({
        where: { userId },
        include: {
          drop: {
            select: {
              id: true,
              title: true,
              description: true,
              totalStock: true,
              claimedStock: true,
              startDate: true,
              endDate: true,
              claimWindowStart: true,
              claimWindowEnd: true,
              isActive: true,
              createdAt: true
            }
          }
        },
        orderBy: { joinedAt: 'desc' }, // Most recent first
        skip,
        take: limit
      }),
      prisma.waitlistEntry.count({
        where: { userId }
      })
    ]);

    // Calculate positions for each entry
    const entriesWithPositions = await Promise.all(
      entries.map(async (entry) => {
        const position = await this.getWaitlistPosition(userId, entry.dropId);
        
        // Determine status
        let status = 'waiting';
        const now = new Date();
        
        if (!entry.drop.isActive) {
          status = 'inactive';
        } else if (entry.drop.claimWindowStart && now >= entry.drop.claimWindowStart && now <= entry.drop.claimWindowEnd) {
          status = 'claimable';
        } else if (entry.drop.endDate && now > entry.drop.endDate) {
          status = 'ended';
        } else if (entry.drop.claimedStock >= entry.drop.totalStock) {
          status = 'sold_out';
        }

        return {
          ...entry,
          position: position || 0,
          status,
          canClaim: status === 'claimable' && (position || 0) <= (entry.drop.totalStock - entry.drop.claimedStock),
          estimatedClaimTime: entry.drop.claimWindowStart
        };
      })
    );

    // Calculate summary statistics
    const summary = {
      totalActive: entriesWithPositions.filter(e => e.status === 'waiting').length,
      totalClaimable: entriesWithPositions.filter(e => e.status === 'claimable' && e.canClaim).length,
      totalCompleted: entriesWithPositions.filter(e => ['ended', 'sold_out', 'inactive'].includes(e.status)).length
    };

    return {
      entries: entriesWithPositions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1
      },
      summary
    };
  }
}
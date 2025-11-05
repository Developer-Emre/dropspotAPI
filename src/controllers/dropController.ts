import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

/**
 * Drop Controller
 * Handles drop listing and admin CRUD operations
 */
export class DropController {
  
  /**
   * GET /drops - List active drops
   * Returns all drops that are currently active (not ended)
   */
  public static async getActiveDrops(req: Request, res: Response): Promise<void> {
    try {
      const now = new Date();
      
      const activeDrops = await prisma.drop.findMany({
        where: {
          endDate: {
            gte: now
          }
        },
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          totalStock: true,
          claimedStock: true,
          startDate: true,
          endDate: true,
          claimWindowStart: true,
          claimWindowEnd: true,
          createdAt: true,
          _count: {
            select: {
              waitlistEntries: true
            }
          }
        },
        orderBy: {
          startDate: 'asc'
        }
      });

      const dropsWithStats = activeDrops.map((drop: any) => ({
        ...drop,
        availableStock: drop.totalStock - drop.claimedStock,
        waitlistCount: drop._count.waitlistEntries,
        status: now < drop.startDate ? 'upcoming' : 
                now < drop.claimWindowStart ? 'waitlist' :
                now < drop.claimWindowEnd ? 'claiming' : 'ended'
      }));

      res.json({
        success: true,
        data: dropsWithStats,
        count: dropsWithStats.length
      });

    } catch (error) {
      console.error('Error fetching active drops:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching drops'
      });
    }
  }

  /**
   * POST /admin/drops - Create new drop (Admin only)
   */
  public static async createDrop(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const {
        title,
        description,
        imageUrl,
        totalStock,
        startDate,
        endDate,
        claimWindowStart,
        claimWindowEnd
      } = req.body;

      // Create new drop
      const newDrop = await prisma.drop.create({
        data: {
          title,
          description,
          imageUrl,
          totalStock: parseInt(totalStock),
          claimedStock: 0,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          claimWindowStart: new Date(claimWindowStart),
          claimWindowEnd: new Date(claimWindowEnd)
        }
      });

      res.status(201).json({
        success: true,
        message: 'Drop created successfully',
        data: newDrop
      });

    } catch (error) {
      console.error('Error creating drop:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while creating drop'
      });
    }
  }

  /**
   * PUT /admin/drops/:id - Update drop (Admin only)
   */
  public static async updateDrop(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const updateData = req.body;

      // Check if drop exists
      const existingDrop = await prisma.drop.findUnique({
        where: { id }
      });

      if (!existingDrop) {
        res.status(404).json({
          success: false,
          message: 'Drop not found'
        });
        return;
      }

      // Prepare update data with proper date conversion
      const processedUpdateData: any = { ...updateData };
      if (updateData.startDate) processedUpdateData.startDate = new Date(updateData.startDate);
      if (updateData.endDate) processedUpdateData.endDate = new Date(updateData.endDate);
      if (updateData.claimWindowStart) processedUpdateData.claimWindowStart = new Date(updateData.claimWindowStart);
      if (updateData.claimWindowEnd) processedUpdateData.claimWindowEnd = new Date(updateData.claimWindowEnd);
      if (updateData.totalStock) processedUpdateData.totalStock = parseInt(updateData.totalStock);

      // Update drop
      const updatedDrop = await prisma.drop.update({
        where: { id },
        data: processedUpdateData
      });

      res.json({
        success: true,
        message: 'Drop updated successfully',
        data: updatedDrop
      });

    } catch (error) {
      console.error('Error updating drop:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating drop'
      });
    }
  }

  /**
   * DELETE /admin/drops/:id - Delete drop (Admin only)
   */
  public static async deleteDrop(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Check if drop exists
      const existingDrop = await prisma.drop.findUnique({
        where: { id },
        include: {
          waitlistEntries: true,
          claims: true
        }
      });

      if (!existingDrop) {
        res.status(404).json({
          success: false,
          message: 'Drop not found'
        });
        return;
      }

      // Check if drop has active claims or waitlist entries
      if (existingDrop.waitlistEntries.length > 0 || existingDrop.claims.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete drop with existing waitlist entries or claims'
        });
        return;
      }

      // Delete drop
      await prisma.drop.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Drop deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting drop:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while deleting drop'
      });
    }
  }

  /**
   * GET /admin/drops - List all drops for admin (Admin only)
   */
  public static async getAllDrops(req: AuthRequest, res: Response): Promise<void> {
    try {
      const drops = await prisma.drop.findMany({
        include: {
          _count: {
            select: {
              waitlistEntries: true,
              claims: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const dropsWithStats = drops.map((drop: any) => ({
        ...drop,
        availableStock: drop.totalStock - drop.claimedStock,
        waitlistCount: drop._count.waitlistEntries,
        claimsCount: drop._count.claims
      }));

      res.json({
        success: true,
        data: dropsWithStats,
        count: dropsWithStats.length
      });

    } catch (error) {
      console.error('Error fetching all drops:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching drops'
      });
    }
  }
}
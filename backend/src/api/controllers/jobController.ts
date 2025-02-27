import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { location, educationArea, search } = req.query;
    
    // Bygg filter baserat på query params
    const where: any = {};
    
    if (location) {
      where.location = { contains: location as string, mode: 'insensitive' };
    }
    
    if (educationArea) {
      where.educationArea = { contains: educationArea as string, mode: 'insensitive' };
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    const jobs = await prisma.job.findMany({
      where,
      orderBy: { postedDate: 'desc' },
      take: 50
    });
    
    res.json({ data: jobs });
  } catch (error) {
    next(error);
  }
};

export const getJobById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const job = await prisma.job.findUnique({
      where: { id }
    });
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.json({ data: job });
  } catch (error) {
    next(error);
  }
};

export default { getJobs, getJobById };
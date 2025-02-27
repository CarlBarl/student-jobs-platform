// src/utils/scheduler.ts

import cron from 'node-cron';
import { scheduledJobsService } from '../services/jobs/scheduled-jobs.service';
import { logger } from './logger';

export class Scheduler {
  private static instance: Scheduler;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  private constructor() {
    // Initialize jobs
    this.setupJobs();
  }

  public static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  private setupJobs(): void {
    // Daily jobs (runs at 1:00 AM)
    this.addJob('markExpiredJobs', '0 1 * * *', async () => {
      logger.info('Running scheduled job: markExpiredJobs');
      try {
        await scheduledJobsService.markExpiredJobs();
      } catch (error) {
        logger.error(`Error in scheduled job markExpiredJobs: ${error}`);
      }
    });

    // Daily jobs (runs at 2:00 AM)
    this.addJob('anonymizeActivityLogs', '0 2 * * *', async () => {
      logger.info('Running scheduled job: anonymizeActivityLogs');
      try {
        await scheduledJobsService.anonymizeActivityLogs();
      } catch (error) {
        logger.error(`Error in scheduled job anonymizeActivityLogs: ${error}`);
      }
    });

    // Daily jobs (runs at 3:00 AM)
    this.addJob('processGdprRequests', '0 3 * * *', async () => {
      logger.info('Running scheduled job: processGdprRequests');
      try {
        await scheduledJobsService.processGdprRequests();
      } catch (error) {
        logger.error(`Error in scheduled job processGdprRequests: ${error}`);
      }
    });

    // Weekly jobs (runs on Sunday at 1:30 AM)
    this.addJob('archiveOldJobs', '30 1 * * 0', async () => {
      logger.info('Running scheduled job: archiveOldJobs');
      try {
        await scheduledJobsService.archiveOldJobs();
      } catch (error) {
        logger.error(`Error in scheduled job archiveOldJobs: ${error}`);
      }
    });

    // Monthly jobs (runs on the 1st of each month at 2:00 AM)
    this.addJob('archiveOldSearchHistory', '0 2 1 * *', async () => {
      logger.info('Running scheduled job: archiveOldSearchHistory');
      try {
        await scheduledJobsService.archiveOldSearchHistory();
      } catch (error) {
        logger.error(`Error in scheduled job archiveOldSearchHistory: ${error}`);
      }
    });

    // Monthly jobs (runs on the 2nd of each month at 2:30 AM)
    this.addJob('cleanupOrphanedCompanies', '30 2 2 * *', async () => {
      logger.info('Running scheduled job: cleanupOrphanedCompanies');
      try {
        await scheduledJobsService.cleanupOrphanedCompanies();
      } catch (error) {
        logger.error(`Error in scheduled job cleanupOrphanedCompanies: ${error}`);
      }
    });

    // Monthly jobs (runs on the 3rd of each month at 3:00 AM)
    this.addJob('anonymizeInactiveUsers', '0 3 3 * *', async () => {
      logger.info('Running scheduled job: anonymizeInactiveUsers');
      try {
        await scheduledJobsService.anonymizeInactiveUsers();
      } catch (error) {
        logger.error(`Error in scheduled job anonymizeInactiveUsers: ${error}`);
      }
    });

    logger.info('Scheduled jobs have been set up');
  }

  private addJob(name: string, schedule: string, task: () => Promise<void>): void {
    try {
      const job = cron.schedule(schedule, task, {
        scheduled: false,
        timezone: 'Europe/Stockholm'
      });

      this.jobs.set(name, job);
      logger.info(`Job "${name}" added with schedule "${schedule}"`);
    } catch (error) {
      logger.error(`Error setting up job "${name}": ${error}`);
    }
  }

  public startAll(): void {
    for (const [name, job] of this.jobs.entries()) {
      job.start();
      logger.info(`Started job: ${name}`);
    }
    logger.info('All scheduled jobs started');
  }

  public stopAll(): void {
    for (const [name, job] of this.jobs.entries()) {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    }
    logger.info('All scheduled jobs stopped');
  }

  public getJob(name: string): cron.ScheduledTask | undefined {
    return this.jobs.get(name);
  }

  public runJobManually(name: string): Promise<void> {
    const job = this.jobs.get(name);
    if (!job) {
      logger.error(`Job "${name}" not found`);
      return Promise.reject(new Error(`Job "${name}" not found`));
    }

    logger.info(`Manually running job: ${name}`);
    return job.now();
  }
}

export const scheduler = Scheduler.getInstance();
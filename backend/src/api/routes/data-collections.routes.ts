import { Router } from 'express';
import { DataCollectionService } from '../../services/data-collection';
import { asyncHandler } from '../middlewares/asyncHandler';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export const dataCollectionRoutes = (
  dataCollectionService: DataCollectionService,
  authMiddleware: AuthMiddleware
) => {
  const router = Router();
  
  /**
   * @route GET /api/data-collection/sources
   * @desc Get all data sources
   * @access Private (Admin only)
   */
  router.get(
    '/sources',
    authMiddleware.isAdmin,
    asyncHandler(async (req, res) => {
      const sources = dataCollectionService.getSources();
      
      // Map sources to DTO to avoid exposing sensitive information
      const sourcesDto = sources.map(source => ({
        id: source.id,
        name: source.name,
        type: source.type,
        isEnabled: source.isEnabled,
        scheduleExpression: source.scheduleExpression,
        priority: source.priority
      }));
      
      res.json(sourcesDto);
    })
  );
  
  /**
   * @route POST /api/data-collection/run/:sourceId
   * @desc Run collection for a specific source
   * @access Private (Admin only)
   */
  router.post(
    '/run/:sourceId',
    authMiddleware.isAdmin,
    asyncHandler(async (req, res) => {
      const { sourceId } = req.params;
      
      await dataCollectionService.runCollection(sourceId);
      
      res.json({ message: `Collection for source ${sourceId} started successfully` });
    })
  );
  
  return router;
};
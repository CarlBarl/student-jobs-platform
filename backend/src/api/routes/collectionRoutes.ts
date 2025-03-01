/**
 * Routes for job data collection
 */
import { Router } from 'express';
import * as collectionController from '../controllers/collectionController';
import { authenticateAdmin } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @route   POST /api/collection/all
 * @desc    Collect jobs from all sources
 * @access  Admin
 */
router.post('/all', authenticateAdmin, collectionController.collectFromAllSources);

/**
 * @route   POST /api/collection/source/:sourceId
 * @desc    Collect jobs from a specific source
 * @access  Admin
 */
router.post('/source/:sourceId', authenticateAdmin, collectionController.collectFromSource);

/**
 * @route   GET /api/collection/status
 * @desc    Get collection status
 * @access  Admin
 */
router.get('/status', authenticateAdmin, collectionController.getCollectionStatus);

export default router;
import express from 'express';
import jobRoutes from './jobRoutes';

const router = express.Router();

router.use('/jobs', jobRoutes);

export default router;
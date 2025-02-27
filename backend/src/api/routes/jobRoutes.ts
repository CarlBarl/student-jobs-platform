import express from 'express';
import jobController from '../controllers/jobController';

const router = express.Router();

router.get('/', jobController.getJobs);
router.get('/:id', jobController.getJobById);

export default router;
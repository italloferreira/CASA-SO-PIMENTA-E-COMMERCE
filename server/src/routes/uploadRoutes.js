import { Router } from 'express';
import multer from 'multer';
import { storage } from '../config/cloudinary.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});

router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  function (req, res, next) {
    upload.single('image')(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'Arquivo muito grande. Máximo permitido: 2 MB.' });
        }
        return res.status(400).json({ message: err.message });
      }
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        message: 'Nenhuma imagem enviada.'
      });
    }

    res.status(201).json({
      message: 'Imagem enviada com sucesso.',
      image_url: req.file.path
    });
  }
);

export default router;
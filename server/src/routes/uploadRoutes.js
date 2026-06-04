import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'src/uploads');
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, fileName);
  }
});

function fileFilter(req, file, callback) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.mimetype)) {
    return callback(new Error('Tipo de arquivo inválido.'));
  }

  callback(null, true);
}

const upload = multer({
  storage,
  fileFilter,
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

    const imageUrl = `/uploads/${req.file.filename}`;

    res.status(201).json({
      message: 'Imagem enviada com sucesso.',
      image_url: imageUrl
    });
  }
);

export default router;
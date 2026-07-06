import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'casa-so-pimenta',
    allowed_formats: ['jpeg', 'jpg', 'png', 'webp'],
    max_file_size: 2 * 1024 * 1024,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }]
  }
});

export { cloudinary, storage };

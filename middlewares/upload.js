const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const UPLOAD = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD),
  filename:    (_, f, cb)  =>
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(f.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, f, cb) => {
    const ext = path.extname(f.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return cb(new Error('Chỉ hỗ trợ file ảnh JPG, PNG, WEBP'));
    }
    if (!f.mimetype.startsWith('image/')) {
      return cb(new Error('Định dạng file không hợp lệ'));
    }
    cb(null, true);
  },
});

// Security validation middleware
const validateImage = async (req, res, next) => {
  if (!req.file) return next();
  try {
    // Check original extension
    const originalExt = path.extname(req.file.originalname).toLowerCase();
    
    // Dynamically import file-type (ESM)
    const { fileTypeFromFile } = await import('file-type');
    
    // Check actual file content type (Magic Numbers)
    const type = await fileTypeFromFile(req.file.path);
    if (!type || !type.mime.startsWith('image/')) {
      fs.unlinkSync(req.file.path); // Delete invalid file
      return res.status(400).json({ error: 'File không phải là hình ảnh hợp lệ (fake extension).' });
    }
    
    // Ensure extension matches mime type roughly
    if (
      (originalExt === '.jpg' || originalExt === '.jpeg') && type.ext !== 'jpg' ||
      originalExt === '.png' && type.ext !== 'png' ||
      originalExt === '.webp' && type.ext !== 'webp'
    ) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Định dạng file không khớp với nội dung thực tế.' });
    }

    // Check image dimensions and sanitize via re-encoding
    const image = sharp(req.file.path);
    const metadata = await image.metadata();
    
    if (metadata.width < 10 || metadata.height < 10) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Ảnh quá nhỏ.' });
    }
    if (metadata.width > 4000 || metadata.height > 4000) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Ảnh quá lớn (max 4000x4000).' });
    }
    
    // RE-ENCODE the image to strip EXIF and hidden payloads
    const buffer = await image
      .resize({ width: Math.min(metadata.width, 2000), withoutEnlargement: true }) // Max 2000px safe width
      .webp({ quality: 80 }) // Force convert to webp to clean any malware hidden in JPEG/PNG chunks
      .toBuffer();
      
    // Overwrite the original file with the sanitized buffer
    fs.writeFileSync(req.file.path, buffer);
    
    // Note: the filename remains the same, but the content is now guaranteed 100% webp image bytes.
    // If we wanted to change the extension in req.file we could, but it's okay for now.

    next();
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Lỗi xử lý file ảnh: file bị hỏng hoặc không đúng định dạng.' });
  }
};

module.exports = { upload, validateImage };

const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');
const { getDB } = require('../config/db');

const BUCKET_NAME = 'portalUploads';

async function storeUploadedFile(file) {
  if (!file) return null;
  if (!file.buffer) throw new Error('Uploaded file is not available in memory.');

  const bucket = new GridFSBucket(getDB(), { bucketName: BUCKET_NAME });
  const safeName = (file.originalname || 'attachment').replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const uploadStream = bucket.openUploadStream(safeName, {
    contentType: file.mimetype || 'application/octet-stream',
    metadata: {
      originalName: file.originalname || safeName,
      contentType: file.mimetype || 'application/octet-stream',
      size: file.size,
    },
  });

  await new Promise((resolve, reject) => {
    uploadStream.once('error', reject);
    uploadStream.once('finish', resolve);
    Readable.from(file.buffer).pipe(uploadStream);
  });

  return {
    url: '/api/uploads/' + uploadStream.id.toString(),
    name: file.originalname || safeName,
    type: file.mimetype || 'application/octet-stream',
  };
}

module.exports = { storeUploadedFile, BUCKET_NAME };

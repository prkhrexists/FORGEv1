/**
 * FILE: server/middleware/upload.js
 * PURPOSE: Multer file upload configuration.
 * DEPENDENCIES: multer
 * USED BY: routes/resume.js
 */

import multer from 'multer'

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

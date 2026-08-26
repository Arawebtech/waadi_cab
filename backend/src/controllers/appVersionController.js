const AppVersion = require('../models/AppVersion');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/app-versions');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const version = req.body.version || 'unknown';
    const platform = req.body.platform || 'both';
    const filename = `${platform}_${version}_${timestamp}.zip`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB ZIP
    fieldSize: 2 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'), false);
    }
  }
});

class AppVersionController {
  // GET /api/v1/app-version/check - Check if update is required
  async checkUpdate(req, res) {
    try {
      const { currentVersion, platform = 'both' } = req.query;
      
      if (!currentVersion) {
        return res.status(400).json({
          success: false,
          message: 'Current version is required'
        });
      }

      const updateInfo = await AppVersion.checkUpdateRequired(currentVersion, platform);
      
      res.status(200).json({
        success: true,
        data: {
          updateRequired: updateInfo.updateRequired,
          latestVersion: updateInfo.latestVersion?.version || null,
          downloadUrl: updateInfo.latestVersion?.downloadUrl || null,
          releaseNotes: updateInfo.latestVersion?.releaseNotes || '',
          isForced: updateInfo.isForced || false,
          minSupportedVersion: updateInfo.minSupportedVersion || '0.1.0'
        }
      });
    } catch (error) {
      console.error('Check update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check for updates'
      });
    }
  }

  // GET /api/v1/admin/app-versions - Get all versions (admin)
  async getAllVersions(req, res) {
    try {
      const { page = 1, limit = 50, platform } = req.query;
      const skip = (page - 1) * limit;
      
      const query = {};
      if (platform && platform !== 'all') {
        query.$or = [
          { platform: 'both' },
          { platform: platform }
        ];
      }
      
      const versions = await AppVersion.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
      
      const total = await AppVersion.countDocuments(query);
      
      // Transform versions to include fileInfo at root level for frontend compatibility
      const transformedVersions = versions.map(version => ({
        ...version,
        fileName: version.fileInfo?.fileName,
        fileSize: version.fileInfo?.fileSize,
        filePath: version.fileInfo?.filePath,
        uploadedAt: version.fileInfo?.uploadedAt
      }));
      
      res.status(200).json({
        success: true,
        data: transformedVersions
      });
    } catch (error) {
      console.error('Get all versions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch versions'
      });
    }
  }

  // POST /api/v1/admin/app-versions - Create new version (admin)
  async createVersion(req, res) {
    try {
      const {
        version,
        releaseNotes,
        isActive,
        isForced,
        minSupportedVersion,
        platform
      } = req.body;

      // Validate required fields
      if (!version) {
        return res.status(400).json({
          success: false,
          message: 'Version is required'
        });
      }

      // Check if version already exists
      const existingVersion = await AppVersion.findOne({ version });
      if (existingVersion) {
        return res.status(400).json({
          success: false,
          message: 'Version already exists'
        });
      }

      let downloadUrl = '';
      let fileInfo = {};

      // Handle file upload if present
      if (req.file) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        downloadUrl = `${baseUrl}/api/v1/admin/app-versions/download/${req.file.filename}`;
        
        fileInfo = {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          filePath: req.file.path,
          uploadedAt: new Date()
        };
      } else {
        // If no file uploaded, provide a placeholder URL
        downloadUrl = 'https://example.com/placeholder.zip';
      }

      const newVersion = new AppVersion({
        version,
        downloadUrl,
        releaseNotes: releaseNotes || '',
        isActive: isActive === 'true' || isActive === true,
        isForced: isForced === 'true' || isForced === true,
        minSupportedVersion: minSupportedVersion || '0.1.0',
        platform: platform || 'both',
        fileInfo,
        createdBy: 'admin'
      });

      await newVersion.save();

      res.status(201).json({
        success: true,
        message: 'Version created successfully',
        data: newVersion
      });
    } catch (error) {
      console.error('Create version error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create version'
      });
    }
  }

  // PUT /api/v1/admin/app-versions/:id - Update version (admin)
  async updateVersion(req, res) {
    try {
      const { id } = req.params;
      const {
        version,
        releaseNotes,
        isActive,
        isForced,
        minSupportedVersion,
        platform
      } = req.body;

      const existingVersion = await AppVersion.findById(id);
      if (!existingVersion) {
        return res.status(404).json({
          success: false,
          message: 'Version not found'
        });
      }

      let updates = {
        releaseNotes: releaseNotes || existingVersion.releaseNotes,
        isActive: isActive === 'true' || isActive === true,
        isForced: isForced === 'true' || isForced === true,
        minSupportedVersion: minSupportedVersion || existingVersion.minSupportedVersion,
        platform: platform || existingVersion.platform,
        updatedAt: new Date()
      };

      // Handle file upload if present
      if (req.file) {
        // Delete old file if exists
        if (existingVersion.fileInfo && existingVersion.fileInfo.filePath) {
          try {
            if (fs.existsSync(existingVersion.fileInfo.filePath)) {
              fs.unlinkSync(existingVersion.fileInfo.filePath);
            }
          } catch (error) {
            console.error('Error deleting old file:', error);
          }
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const downloadUrl = `${baseUrl}/api/v1/admin/app-versions/download/${req.file.filename}`;
        
        updates.downloadUrl = downloadUrl;
        updates.fileInfo = {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          filePath: req.file.path,
          uploadedAt: new Date()
        };
      }

      const updatedVersion = await AppVersion.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        message: 'Version updated successfully',
        data: updatedVersion
      });
    } catch (error) {
      console.error('Update version error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update version'
      });
    }
  }

  // DELETE /api/v1/admin/app-versions/:id - Delete version (admin)
  async deleteVersion(req, res) {
    try {
      const { id } = req.params;

      const version = await AppVersion.findByIdAndDelete(id);

      if (!version) {
        return res.status(404).json({
          success: false,
          message: 'Version not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Version deleted successfully'
      });
    } catch (error) {
      console.error('Delete version error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete version'
      });
    }
  }

  // PUT /api/v1/admin/app-versions/:id/toggle-active - Toggle version active status (admin)
  async toggleActive(req, res) {
    try {
      const { id } = req.params;

      const version = await AppVersion.findById(id);
      if (!version) {
        return res.status(404).json({
          success: false,
          message: 'Version not found'
        });
      }

      version.isActive = !version.isActive;
      await version.save();

      res.status(200).json({
        success: true,
        message: `Version ${version.isActive ? 'activated' : 'deactivated'} successfully`,
        data: version
      });
    } catch (error) {
      console.error('Toggle active error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle version status'
      });
    }
  }

  // GET /api/v1/admin/app-versions/download/:filename - Download app version file
  async downloadFile(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../../uploads/app-versions', filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Set headers for file download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        res.status(500).json({
          success: false,
          message: 'Error downloading file'
        });
      });

    } catch (error) {
      console.error('Download file error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download file'
      });
    }
  }
}

// Export the controller instance
const controller = new AppVersionController();

// Export the upload middleware
controller.uploadAppVersionMiddleware = (req, res, next) => {
  upload.single('buildFile')(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'ZIP file must be 100MB or less',
      });
    }

    if (err.name === 'MulterError') {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed',
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || 'Invalid upload',
    });
  });
};

module.exports = controller;


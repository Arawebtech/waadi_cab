import React, { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Calendar,
  User,
  Smartphone,
  Globe
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.waadi.in/api/v1';

interface AppVersion {
  _id: string;
  version: string;
  downloadUrl: string;
  releaseNotes: string;
  isActive: boolean;
  isForced: boolean;
  minSupportedVersion: string;
  platform: 'android' | 'ios' | 'both';
  fileSize?: number;
  fileName?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export default function AppVersionsPage() {
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVersion, setEditingVersion] = useState<AppVersion | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form state for creating/editing versions
  const [formData, setFormData] = useState({
    version: '',
    releaseNotes: '',
    isActive: true,
    isForced: false,
    minSupportedVersion: '',
    platform: 'both' as 'android' | 'ios' | 'both',
    file: null as File | null
  });

  // Load versions on component mount
  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/admin/app-versions`);
      
      if (response.ok) {
        const result = await response.json();
        setVersions(result.data || []);
      } else {
        alert('Failed to load app versions');
      }
    } catch (error) {
      console.error('Error loading versions:', error);
      alert('Failed to load app versions');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        alert('Please upload a ZIP file');
        return;
      }
      
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        alert('File size must be less than 100MB');
        return;
      }
      
      setFormData(prev => ({ ...prev, file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.file && !editingVersion) {
      alert('Please upload a ZIP file');
      return;
    }

    try {
      setUploading(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('version', formData.version);
      formDataToSend.append('releaseNotes', formData.releaseNotes);
      formDataToSend.append('isActive', formData.isActive.toString());
      formDataToSend.append('isForced', formData.isForced.toString());
      formDataToSend.append('minSupportedVersion', formData.minSupportedVersion);
      formDataToSend.append('platform', formData.platform);
      
      if (formData.file) {
        formDataToSend.append('buildFile', formData.file);
      }

      const url = editingVersion 
        ? `${API_URL}/admin/app-versions/${editingVersion._id}`
        : `${API_URL}/admin/app-versions`;
      
      const method = editingVersion ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formDataToSend
      });

      if (response.ok) {
        alert(editingVersion ? 'Version updated successfully' : 'Version created successfully');
        setShowCreateModal(false);
        setEditingVersion(null);
        resetForm();
        loadVersions();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save version');
      }
    } catch (error) {
      console.error('Error saving version:', error);
      alert('Failed to save version');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (version: AppVersion) => {
    setEditingVersion(version);
    setFormData({
      version: version.version,
      releaseNotes: version.releaseNotes,
      isActive: version.isActive,
      isForced: version.isForced,
      minSupportedVersion: version.minSupportedVersion,
      platform: version.platform,
      file: null
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this version?')) return;

    try {
      const response = await fetch(`${API_URL}/admin/app-versions/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Version deleted successfully');
        loadVersions();
      } else {
        alert('Failed to delete version');
      }
    } catch (error) {
      console.error('Error deleting version:', error);
      alert('Failed to delete version');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`${API_URL}/admin/app-versions/${id}/toggle-active`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (response.ok) {
        alert(`Version ${!isActive ? 'activated' : 'deactivated'} successfully`);
        loadVersions();
      } else {
        alert('Failed to toggle version status');
      }
    } catch (error) {
      console.error('Error toggling version status:', error);
      alert('Failed to toggle version status');
    }
  };

  const resetForm = () => {
    setFormData({
      version: '',
      releaseNotes: '',
      isActive: true,
      isForced: false,
      minSupportedVersion: '',
      platform: 'both',
      file: null
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'android': return <Smartphone className="h-4 w-4 text-green-600" />;
      case 'ios': return <Smartphone className="h-4 w-4 text-blue-600" />;
      case 'both': return <Globe className="h-4 w-4 text-purple-600" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">App Versions</h1>
            <p className="text-gray-600 mt-2">Manage OTA updates for your mobile app</p>
          </div>
          <button 
            onClick={() => {
              resetForm();
              setEditingVersion(null);
              setShowCreateModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Version
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Versions</p>
                <p className="text-2xl font-bold text-gray-900">{versions.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Versions</p>
                <p className="text-2xl font-bold text-green-600">
                  {versions.filter(v => v.isActive).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Forced Updates</p>
                <p className="text-2xl font-bold text-orange-600">
                  {versions.filter(v => v.isForced).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Latest Version</p>
                <p className="text-2xl font-bold text-purple-600">
                  {versions.length > 0 ? versions[0].version : 'N/A'}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Versions List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">App Versions</h2>
                <p className="text-gray-600 mt-1">
                  Manage and monitor app versions for OTA updates
                </p>
              </div>
              <button 
                onClick={loadVersions}
                disabled={loading}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2">Loading versions...</span>
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No versions found</h3>
                <p className="text-gray-600 mb-4">Create your first app version to enable OTA updates</p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  Create Version
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {versions.map((version) => (
                  <div key={version._id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-blue-100 text-blue-800 text-lg px-3 py-1 rounded-full font-medium">
                            v{version.version}
                          </span>
                          <div className="flex items-center gap-2">
                            {getPlatformIcon(version.platform)}
                            <span className="text-sm text-gray-600 capitalize">{version.platform}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              version.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {version.isActive ? 'Active' : 'Inactive'}
                            </span>
                            {version.isForced && (
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                Forced
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mb-3">{version.releaseNotes}</p>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(version.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {formatFileSize(version.fileSize)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Download className="h-4 w-4" />
                            {version.fileName || 'build.zip'}
                          </div>
                          {version.minSupportedVersion && (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4" />
                              Min: v{version.minSupportedVersion}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(version._id, version.isActive)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm flex items-center gap-1"
                        >
                          {version.isActive ? (
                            <>
                              <XCircle className="h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Activate
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleEdit(version)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded text-sm flex items-center gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                        
                        <button
                          onClick={() => handleDelete(version._id)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingVersion ? 'Edit Version' : 'Create New Version'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {editingVersion ? 'Update version details' : 'Upload a new app version for OTA updates'}
                </p>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-2">
                        Version Number *
                      </label>
                      <input
                        id="version"
                        type="text"
                        value={formData.version}
                        onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                        placeholder="e.g., 1.0.1"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-2">
                        Platform *
                      </label>
                      <select 
                        value={formData.platform} 
                        onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value as 'android' | 'ios' | 'both' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="android">Android</option>
                        <option value="ios">iOS</option>
                        <option value="both">Both Platforms</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="minSupportedVersion" className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Supported Version
                    </label>
                    <input
                      id="minSupportedVersion"
                      type="text"
                      value={formData.minSupportedVersion}
                      onChange={(e) => setFormData(prev => ({ ...prev, minSupportedVersion: e.target.value }))}
                      placeholder="e.g., 1.0.0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="releaseNotes" className="block text-sm font-medium text-gray-700 mb-2">
                      Release Notes *
                    </label>
                    <textarea
                      id="releaseNotes"
                      value={formData.releaseNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, releaseNotes: e.target.value }))}
                      placeholder="Describe what's new in this version..."
                      rows={4}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="buildFile" className="block text-sm font-medium text-gray-700 mb-2">
                      Build File {!editingVersion && '*'}
                    </label>
                    <input
                      id="buildFile"
                      type="file"
                      accept=".zip"
                      onChange={handleFileChange}
                      required={!editingVersion}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Upload a ZIP file containing your app build (max 100MB)
                    </p>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                        Active
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isForced"
                        checked={formData.isForced}
                        onChange={(e) => setFormData(prev => ({ ...prev, isForced: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isForced" className="text-sm font-medium text-gray-700">
                        Forced Update
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setEditingVersion(null);
                        resetForm();
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          {editingVersion ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          {editingVersion ? 'Update Version' : 'Create Version'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
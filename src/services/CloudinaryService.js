import axios from 'axios';

// Replace these with your actual Cloudinary credentials
/**
 * Cloudinary Service for File Operations
 * 
 * SECURITY NOTE: This implementation uses UNSIGNED uploads for demo purposes.
 * For production:
 * 1. Move to SIGNED uploads to prevent unauthorized file manipulation.
 * 2. Never store API_SECRET on the client-side.
 * 3. Use a backend proxy to generate signatures.
 */

const CLOUD_NAME = 'dakgga4uq'; 
const UPLOAD_PRESET = 'manthan';
const API_KEY = '572236319176311'; // Publicly visible, but used only for list operations

const CloudinaryService = {
  /**
   * Uploads a file to Cloudinary
   * @param {File} file - The file to upload
   * @param {string} folder - The folder to upload to
   * @returns {Promise} - The Cloudinary response
   */
  uploadFile: async (file, folder = 'organized_files') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);
    // Add a tag to make it easy to list files later
    formData.append('tags', `portal_file,${folder}`);

    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
        formData
      );
      return response.data;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw error;
    }
  },

  /**
   * Lists files from Cloudinary using a tag
   * Note: This requires "Client-side asset list" to be enabled in Cloudinary settings.
   * Settings -> Security -> Restricted media types: Uncheck "Resource list"
   * @param {string} tag - The tag to filter by
   * @returns {Promise<Array>} - List of resources
   */
  listFilesByTag: async (tag = 'portal_file') => {
    try {
      // Cloudinary's client-side listing is resource-type specific.
      // We'll try to fetch from all three common types and combine them.
      const types = ['image', 'video', 'raw'];
      const requests = types.map(type => 
        axios.get(`https://res.cloudinary.com/${CLOUD_NAME}/${type}/list/${tag}.json`)
          .then(res => res.data.resources.map(r => ({ ...r, resource_type: type })))
          .catch(() => []) // Silently ignore if a specific type has no files
      );
      
      const results = await Promise.all(requests);
      const allResources = results.flat();
      
      // Sort by creation date descending
      return allResources.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
      console.error('Error listing from Cloudinary:', error);
      return [];
    }
  }
};

export default CloudinaryService;

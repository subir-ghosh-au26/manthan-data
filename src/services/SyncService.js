import axios from 'axios';

const CLOUD_NAME = 'dakgga4uq';
const UPLOAD_PRESET = 'manthan';
const SYNC_FILE_ID = 'manthan_portal_sync';

const SyncService = {
  /**
   * Fetches the global sync manifest from Cloudinary
   */
  getManifest: async () => {
    try {
      // We use a timestamp to bypass browser caching
      const response = await axios.get(
        `https://res.cloudinary.com/${CLOUD_NAME}/raw/upload/v1/${SYNC_FILE_ID}.json?t=${Date.now()}`
      );
      return response.data;
    } catch (error) {
      console.warn('No global sync manifest found, starting fresh.');
      return { files: [], folders: [{ name: 'General', count: 0 }] };
    }
  },

  /**
   * Updates and uploads the global sync manifest
   */
  saveManifest: async (data) => {
    try {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('public_id', SYNC_FILE_ID);
      formData.append('resource_type', 'raw');

      await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
        formData
      );
      console.log('✅ Global manifest synced to Cloudinary');
    } catch (error) {
      console.error('❌ Failed to save global manifest:', error);
    }
  }
};

export default SyncService;

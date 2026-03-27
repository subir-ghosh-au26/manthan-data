import React, { useState, useEffect } from 'react';
import {
  Folder,
  File,
  Grid,
  List,
  Upload,
  Download,
  ChevronRight,
  Search,
  MoreVertical,
  User,
  ShieldCheck,
  Eye,
  LogOut,
  FileText,
  Presentation,
  Film,
  FileCode,
} from 'lucide-react';
import CloudinaryService from './services/CloudinaryService';
import QRCodeStyling from 'qr-code-styling';

// Mock data for initial UI development - now empty
const MOCK_FOLDERS = [];
const MOCK_FILES = [];

const qrCode = new QRCodeStyling({
  width: 350,
  height: 350,
  type: 'svg',
  data: window.location.href,
  image: "/logo.png",
  dotsOptions: {
    color: '#002a5c',
    type: 'rounded',
  },
  backgroundOptions: {
    color: "#ffffff",
  },
  imageOptions: {
    crossOrigin: "anonymous",
    margin: 10,
    imageSize: 0.5
  },
  cornersSquareOptions: {
    type: "extra-rounded",
    color: "#002a5c"
  },
  cornersDotOptions: {
    type: "dot",
    color: "#002a5c"
  }
});

// Security: Obfuscated Admin Configuration
const AUTH_KEY = '_m_auth_state_v2';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const SECRET_HASH = 'BIPARD' + 'Manthan' + '2025'; // Combined to avoid simple text search

function App() {
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const authData = localStorage.getItem(AUTH_KEY);
      if (!authData) return false;
      const { authenticated, expiresAt } = JSON.parse(authData);
      if (authenticated && Date.now() < expiresAt) {
        return true;
      }
      localStorage.removeItem(AUTH_KEY); // Clean up expired session
      return false;
    } catch (e) {
      return false;
    }
  });
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showFolderPrompt, setShowFolderPrompt] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      const expiry = Date.now() + SESSION_DURATION;
      localStorage.setItem(AUTH_KEY, JSON.stringify({ 
        authenticated: true, 
        expiresAt: expiry,
        version: '2.0.0'
      }));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }, [isAdmin]);

  const qrRef = React.useRef(null);

  useEffect(() => {
    if (showQRCodeModal && qrRef.current) {
      qrCode.append(qrRef.current);
    }
  }, [showQRCodeModal]);

  useEffect(() => {
    qrCode.update({
      data: window.location.href
    });
  }, []);

  const downloadQRCode = () => {
    qrCode.download({ name: 'manthan-2025-qr', extension: 'png' });
  };

  const [viewMode, setViewMode] = useState('grid');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize state from localStorage if available
  const [files, setFiles] = useState(() => {
    const saved = localStorage.getItem('manthan_files');
    return saved ? JSON.parse(saved) : [];
  });

  const [folders, setFolders] = useState(() => {
    const saved = localStorage.getItem('manthan_folders');
    return saved ? JSON.parse(saved) : [{ id: 'general', name: 'General', count: 0 }];
  });

  const [isUploading, setIsUploading] = useState(false);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('manthan_files', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem('manthan_folders', JSON.stringify(folders));
  }, [folders]);

  const fetchFiles = async () => {
    console.log('🔄 Syncing with Cloudinary...');
    try {
      const resources = await CloudinaryService.listFilesByTag('portal_file');
      console.log(`✅ Fetched ${resources?.length || 0} resources from Cloudinary.`);

        if (resources && resources.length > 0) {
          const mappedFiles = resources.map(r => {
            // Priority: Context Metadata > Path > Default
            const contextFolder = r.context?.custom?.folder;
            const parts = r.public_id.split('/');
            const fileName = parts.pop();
            const pathFolder = parts.length > 0 ? parts.join('/') : null;

            const folderName = contextFolder || pathFolder || 'General';

            return {
              id: r.public_id,
              name: r.context?.custom?.caption || fileName || 'Untitled',
              size: r.bytes ? `${(r.bytes / 1024).toFixed(1)} KB` : 'Size Unknown',
              type: r.format?.toUpperCase() || 'FILE',
              folder: folderName,
              url: r.secure_url
            };
          });
          setFiles(mappedFiles);

        setFolders(prevFolders => {
          const fetchedFolderNames = Array.from(new Set(mappedFiles.map(f => f.folder)));
          const existingNames = prevFolders.map(f => f.name);

          const updated = prevFolders.map(folder => ({
            ...folder,
            count: mappedFiles.filter(file => file.folder === folder.name).length
          }));

          const newFolders = fetchedFolderNames
            .filter(name => !existingNames.includes(name))
            .map(name => ({
              id: name,
              name: name,
              count: mappedFiles.filter(f => f.folder === name).length
            }));

          const finalFolders = [...updated, ...newFolders];
          if (!finalFolders.find(f => f.name === 'General')) {
            finalFolders.push({ id: 'general', name: 'General', count: 0 });
          }
          console.log('📂 Restored folders:', finalFolders.map(f => f.name));
          return finalFolders;
        });
      }
    } catch (error) {
      console.error('❌ Cloudinary sync failed:', error);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Removed redundant ADMIN_PASSWORD constant

  // Filter files based on current folder and search query
  const filteredFiles = files.filter(file => {
    const matchesFolder = currentFolder ? file.folder === currentFolder.name : true;
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const handleAdminToggle = () => {
    if (!isAdmin) {
      setShowPasswordPrompt(true);
    } else {
      setIsAdmin(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === SECRET_HASH) {
      setIsAdmin(true);
      setShowPasswordPrompt(false);
      setPasswordInput('');
    } else {
      alert('Invalid admin password!');
    }
  };

  const handleCreateFolder = (e) => {
    e.preventDefault();
    const trimmedName = newFolderName.trim();
    if (trimmedName) {
      const newFolder = {
        id: Date.now().toString(),
        name: trimmedName,
        count: 0
      };
      const updatedFolders = [...folders, newFolder];
      setFolders(updatedFolders);
      setShowFolderPrompt(false);
      setNewFolderName('');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const folderName = currentFolder ? currentFolder.name : 'General';
      const result = await CloudinaryService.uploadFile(file, folderName);

      const fileSize = result.bytes ? `${(result.bytes / 1024).toFixed(1)} KB` : 'Size Unknown';
      const newFile = {
        id: result.public_id,
        name: file.name,
        size: fileSize,
        type: result.format?.toUpperCase() || 'FILE',
        folder: folderName,
        url: result.secure_url
      };

      setFiles(prev => [newFile, ...prev]);

      // Update folder count
      setFolders(folders.map(f =>
        f.name === folderName ? { ...f, count: f.count + 1 } : f
      ));

      alert('File uploaded successfully!');
    } catch (error) {
      console.error('Upload error details:', error);
      const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown error';
      alert(`Upload failed: ${errorMsg}\n\nCheck Cloudinary console for: 1. Unsigned upload preset 'manthan' 2. Correct Cloud Name 'dakgga4uq'`);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadFile = (url, fileName) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (file) => {
    const name = file.name?.toLowerCase() || '';

    if (name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
      return <div className="bg-indigo-100 text-indigo-600 p-3 rounded-2xl"><Grid className="w-10 h-10" /></div>;
    }
    if (name.endsWith('.pdf')) {
      return <div className="bg-red-100 text-red-600 p-3 rounded-2xl"><FileText className="w-10 h-10" /></div>;
    }
    if (name.match(/\.(mp4|mov|avi|wmv|mkv)$/)) {
      return <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl"><Film className="w-10 h-10" /></div>;
    }
    if (name.match(/\.(ppt|pptx)$/)) {
      return <div className="bg-orange-100 text-orange-600 p-3 rounded-2xl"><Presentation className="w-10 h-10" /></div>;
    }
    return <div className="bg-slate-100 text-slate-400 p-3 rounded-2xl"><File className="w-10 h-10" /></div>;
  };

  const getListIcon = (file) => {
    const name = file.name?.toLowerCase() || '';
    if (name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) return <Grid className="w-5 h-5 text-indigo-600" />;
    if (name.endsWith('.pdf')) return <FileText className="w-5 h-5 text-red-600" />;
    if (name.match(/\.(mp4|mov|avi|wmv|mkv)$/)) return <Film className="w-5 h-5 text-amber-600" />;
    if (name.match(/\.(ppt|pptx)$/)) return <Presentation className="w-5 h-5 text-orange-600" />;
    return <File className="w-5 h-5 text-slate-400" />;
  };

  const clearAllData = () => {
    if (window.confirm('⚠️ Are you sure you want to clear all local portal data? This will reset your folders and cached file list. (Files on Cloudinary will not be deleted).')) {
      localStorage.removeItem('manthan_files');
      localStorage.setItem('manthan_folders', JSON.stringify([{ id: 'general', name: 'General', count: 0 }]));
      setFiles([]);
      setFolders([{ id: 'general', name: 'General', count: 0 }]);
      setCurrentFolder(null);
      alert('Portal reset complete!');
    }
  };

  const syncData = async () => {
    setIsUploading(true);
    await fetchFiles();
    setIsUploading(false);
    alert('Synchronization complete!');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg cursor-pointer" onClick={() => window.location.reload()}>
            <Folder className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Manthan<span className="text-indigo-600">2025</span></h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={syncData}
            title="Sync with Cloudinary"
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
          >
            <Upload className={`w-5 h-5 ${isUploading ? 'animate-spin' : ''}`} style={{ transform: isUploading ? 'none' : 'rotate(180deg)' }} />
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowQRCodeModal(true)}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors text-xs font-semibold uppercase tracking-wider border border-indigo-100"
            >
              <Grid className="w-4 h-4" /> {/* Using Grid icon as a placeholder for QR style if needed, or just keep it simple */}
              <span>QR Portal</span>
            </button>
          )}
          <div className="relative group">
            <div
              onClick={handleAdminToggle}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-colors ${isAdmin ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
              <span className="text-xs font-semibold uppercase tracking-wider">{isAdmin ? 'Admin' : 'Switch to Admin'}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* QR Code Modal (Admin Only) */}
      {showQRCodeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-100 flex flex-col items-center">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Grid className="w-6 h-6 text-indigo-600" />
              Portal QR Code
            </h3>
            <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-50 mb-8" ref={qrRef} />
            <p className="text-center text-slate-500 text-sm mb-6">Scan this code to instantly access the Manthan 2025 portal from any device.</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowQRCodeModal(false)}
                className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl hover:bg-slate-200 transition-all"
              >
                Close
              </button>
              <button
                onClick={downloadQRCode}
                className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Prompt Modal */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Admin Access Required
            </h3>
            <input
              type="password"
              placeholder="Enter password..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit(e)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowPasswordPrompt(false)}
                className="flex-1 bg-slate-100 text-slate-600 font-semibold py-2 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 bg-indigo-600 text-white font-semibold py-2 rounded-xl hover:bg-indigo-700 transition-all"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderPrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Folder className="w-5 h-5 text-indigo-600" />
              Create New Folder
            </h3>
            <input
              type="text"
              placeholder="Folder name..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder(e)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowFolderPrompt(false)}
                className="flex-1 bg-slate-100 text-slate-600 font-semibold py-2 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="flex-1 bg-indigo-600 text-white font-semibold py-2 rounded-xl hover:bg-indigo-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200 min-h-[calc(100vh-73px)] p-6 hidden md:block">
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Library</h2>
            <nav className="space-y-1">
              <button
                onClick={() => setCurrentFolder(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${!currentFolder ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <div className="flex items-center gap-3">
                  <Grid className="w-4 h-4" />
                  <span>All Files</span>
                </div>
              </button>
            </nav>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Folders</h2>
              {isAdmin && (
                <button
                  onClick={() => setShowFolderPrompt(true)}
                  className="p-1 hover:bg-indigo-50 text-indigo-600 rounded-md transition-colors"
                  title="Create Folder"
                >
                  <Folder className="w-3 h-3 block" />
                  <span className="text-[10px] font-bold">+</span>
                </button>
              )}
            </div>
            <nav className="space-y-1">
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => setCurrentFolder(folder)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${currentFolder?.id === folder.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <div className="flex items-center gap-3 text-sm">
                    <Folder className={`w-4 h-4 ${currentFolder?.id === folder.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{folder.name}</span>
                  </div>
                  <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">{folder.count}</span>
                </button>
              ))}
            </nav>
          </div>

          {isAdmin && (
            <div className="mt-auto pt-6 border-t border-slate-100">
              <button 
                onClick={clearAllData}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all uppercase tracking-wider"
              >
                <LogOut className="w-4 h-4" />
                <span>Reset Portal</span>
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <nav className="flex items-center text-sm text-slate-500 mb-1">
                <span className="hover:text-indigo-600 cursor-pointer" onClick={() => setCurrentFolder(null)}>All Files</span>
                {currentFolder && (
                  <>
                    <ChevronRight className="w-4 h-4 mx-1" />
                    <span className="text-slate-900 font-medium">{currentFolder.name}</span>
                  </>
                )}
              </nav>
              <h2 className="text-2xl font-bold text-slate-800">{currentFolder ? currentFolder.name : 'All Files'}</h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search files..."
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full md:w-64 transition-all shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {isAdmin && (
                <label className={`flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
                  <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
                </label>
              )}
            </div>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredFiles.map((file) => (
                <div key={file.id} className="group bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300">
                  <div className="relative aspect-square bg-slate-50 rounded-xl mb-4 flex items-center justify-center overflow-hidden border border-slate-100">
                    {getFileIcon(file)}
                    <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => downloadFile(file.url, file.name)}
                        className="bg-white text-indigo-600 p-3 rounded-full hover:scale-110 transition-transform shadow-lg"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm truncate max-w-[150px]">{file.name}</h3>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight mt-1">{file.type} • {file.size}</p>
                    </div>
                    <button className="text-slate-300 hover:text-slate-600">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Size</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Type</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {getListIcon(file)}
                          <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{file.size}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">{file.type}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => downloadFile(file.url, file.name)}
                          className="text-indigo-600 hover:text-indigo-800 p-2 rounded-lg hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredFiles.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-400 italic">No files found in this folder.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* Footer / Info */}
      {isAdmin && (
        <div className="fixed bottom-6 right-6 max-w-sm bg-indigo-900 text-white p-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 border border-indigo-800/50">
          <div className="flex gap-3">
            <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Admin Mode Active</h4>
              <p className="text-xs text-indigo-200 mt-1 leading-relaxed">You can upload new files to Cloudinary. These will be automatically categorized into folders based on your selection.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

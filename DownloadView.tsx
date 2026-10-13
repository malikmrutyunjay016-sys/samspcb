import React, { useState, useEffect } from 'react';
import { Download, FileText, ExternalLink, Plus, Trash2, Calendar, BookOpen, ShieldCheck, FileCheck, Layers } from 'lucide-react';
import { db, doc, setDoc, onSnapshot } from '../firebase';

interface DownloadItem {
  id: string;
  title: string;
  category: string;
  fileSize: string;
  url: string;
  uploadDate: string;
  description: string;
}

const DEFAULT_DOWNLOADS: DownloadItem[] = [
  {
    id: 'd1',
    title: 'SAMS UG Common Prospectus 2026-27',
    category: 'Admission Guidelines',
    fileSize: '4.8 MB',
    url: 'https://www.samsodisha.gov.in/Download/Common_Prospectus_2026.pdf',
    uploadDate: '2026-06-01',
    description: 'Official SAMS e-Admission guidelines, eligibility criteria, reservation rules, and fee structures.'
  },
  {
    id: 'd2',
    title: 'Academic Calendar & Examination Schedule',
    category: 'Academics',
    fileSize: '1.2 MB',
    url: 'https://www.samsodisha.gov.in/Download/Academic_Calendar_2026.pdf',
    uploadDate: '2026-06-10',
    description: 'Semester timeline, internal assessment dates, practical examination schedules, and holidays.'
  },
  {
    id: 'd3',
    title: 'College Fee Structure & Refund Guidelines',
    category: 'Fee & Finance',
    fileSize: '850 KB',
    url: 'https://www.samsodisha.gov.in/Download/Fee_Structure_2026.pdf',
    uploadDate: '2026-06-05',
    description: 'Detailed breakdown of admission fees, tuition fees, laboratory charges, andcaution money deposits.'
  },
  {
    id: 'd4',
    title: 'Anti-Ragging Undertaking Form (Student & Parent)',
    category: 'Compliance',
    fileSize: '520 KB',
    url: 'https://www.samsodisha.gov.in/Download/Anti_Ragging_Affidavit.pdf',
    uploadDate: '2026-06-12',
    description: 'Mandatory undertaking form to be signed by students and parents at the time of admission.'
  },
  {
    id: 'd5',
    title: 'Spot Round Admission Guidelines & Vacancy Rules',
    category: 'Spot Round',
    fileSize: '2.1 MB',
    url: 'https://www.samsodisha.gov.in/Download/Spot_Round_Guidelines_2026.pdf',
    uploadDate: '2026-07-01',
    description: 'Rules and procedures for participating in the institutional spot admission round for vacant seats.'
  },
  {
    id: 'd6',
    title: 'Transfer Certificate (TC) & Migration Application Format',
    category: 'Student Services',
    fileSize: '410 KB',
    url: 'https://www.samsodisha.gov.in/Download/TC_Migration_Application.pdf',
    uploadDate: '2026-06-15',
    description: 'Standard application form for issuing College Leaving Certificate (CLC) and Conduct Certificate.'
  }
];

interface DownloadViewProps {
  userRole: 'admin' | 'hod' | 'student' | null;
  onAuditLog?: (action: string, details: string) => void;
  onOpenLogin?: () => void;
}

export const DownloadView: React.FC<DownloadViewProps> = ({ userRole, onAuditLog, onOpenLogin }) => {
  const [downloads, setDownloads] = useState<DownloadItem[]>(() => {
    try {
      const saved = localStorage.getItem('SAMS_DOWNLOAD_ITEMS');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not load downloads:', e);
    }
    return DEFAULT_DOWNLOADS;
  });

  // Sync downloads in real-time from Firestore across all devices
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'systemSettings', 'downloads'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.items) && data.items.length > 0) {
          setDownloads(data.items);
          localStorage.setItem('SAMS_DOWNLOAD_ITEMS', JSON.stringify(data.items));
        }
      }
    }, (err) => console.warn('Downloads listener notice:', err));

    return () => unsub();
  }, []);

  const saveDownloadsList = async (updated: DownloadItem[]) => {
    setDownloads(updated);
    localStorage.setItem('SAMS_DOWNLOAD_ITEMS', JSON.stringify(updated));
    try {
      await setDoc(doc(db, 'systemSettings', 'downloads'), { items: updated }, { merge: true });
    } catch (e) {
      console.warn('Failed to sync downloads to Firestore:', e);
    }
  };

  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isAddingModal, setIsAddingModal] = useState<boolean>(false);
  const [deletingItem, setDeletingItem] = useState<{ id: string; title: string } | null>(null);

  // New item form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Admission Guidelines');
  const [newFileSize, setNewFileSize] = useState('1.5 MB');
  const [newUrl, setNewUrl] = useState('https://');
  const [newDescription, setNewDescription] = useState('');
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const categories = ['All', 'Admission Guidelines', 'Academics', 'Fee & Finance', 'Compliance', 'Spot Round', 'Student Services'];

  const filteredDownloads = downloads.filter(item => {
    const matchesCat = filterCategory === 'All' || item.category === filterCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleAddDownload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (uploadMode === 'file' && selectedFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const fileDataUrl = reader.result as string;
        const newItem: DownloadItem = {
          id: 'd-' + Date.now(),
          title: newTitle.trim(),
          category: newCategory,
          fileSize: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` || '1.0 MB',
          url: fileDataUrl,
          uploadDate: new Date().toISOString().split('T')[0],
          description: newDescription.trim() || selectedFile.name
        };

        const updated = [newItem, ...downloads];
        saveDownloadsList(updated);

        if (onAuditLog) {
          onAuditLog('ADD_DOWNLOAD_DOCUMENT', `Uploaded file document: ${newItem.title} (${newItem.category})`);
        }

        setNewTitle('');
        setNewUrl('https://');
        setSelectedFile(null);
        setNewDescription('');
        setIsAddingModal(false);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      if (!newUrl.trim()) return;
      const newItem: DownloadItem = {
        id: 'd-' + Date.now(),
        title: newTitle.trim(),
        category: newCategory,
        fileSize: newFileSize.trim() || '1.0 MB',
        url: newUrl.trim(),
        uploadDate: new Date().toISOString().split('T')[0],
        description: newDescription.trim() || 'Official college document.'
      };

      const updated = [newItem, ...downloads];
      saveDownloadsList(updated);

      if (onAuditLog) {
        onAuditLog('ADD_DOWNLOAD_DOCUMENT', `Added document: ${newItem.title} (${newItem.category})`);
      }

      setNewTitle('');
      setNewUrl('https://');
      setSelectedFile(null);
      setNewDescription('');
      setIsAddingModal(false);
    }
  };

  const handleInitiateDelete = (id: string, title: string) => {
    if (userRole !== 'admin' && userRole !== 'hod') {
      alert('Administrative privileges required to delete documents. Please log in as Admin or HOD.');
      if (onOpenLogin) {
        onOpenLogin();
      }
      return;
    }
    setDeletingItem({ id, title });
  };

  const confirmDelete = () => {
    if (!deletingItem) return;
    const { id, title } = deletingItem;
    const updated = downloads.filter(d => d.id !== id);
    saveDownloadsList(updated);

    if (onAuditLog) {
      onAuditLog('DELETE_DOWNLOAD_DOCUMENT', `Deleted download document: ${title}`);
    }
    setDeletingItem(null);
  };

  const handleDownloadItem = (item: DownloadItem, e: React.MouseEvent) => {
    e.preventDefault();
    if (item.url && item.url.startsWith('data:')) {
      const win = window.open();
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>${item.title}</title></head>
            <body style="margin:0; background:#111; display:flex; justify-content:center; align-items:center; height:100vh;">
              ${item.url.startsWith('data:image/') 
                ? `<img src="${item.url}" style="max-width:100%; max-height:100%; object-fit:contain;" />` 
                : `<iframe src="${item.url}" style="width:100%; height:100%; border:none;"></iframe>`}
            </body>
          </html>
        `);
        win.document.close();
      }
      if (onAuditLog) {
        onAuditLog('DOWNLOAD_DOCUMENT', `Viewed/Downloaded uploaded document: ${item.title}`);
      }
      return;
    }

    const content = `==================================================
PANCHAYAT COLLEGE, BARAGADA (SAMS ODISHA)
OFFICIAL DOCUMENT DOWNLOAD
==================================================

Title: ${item.title}
Category: ${item.category}
File Size: ${item.fileSize}
Upload Date: ${item.uploadDate}
Document Reference URL: ${item.url}

Description & Guidelines:
${item.description}

--------------------------------------------------
Official SAMS E-Admission & Academic Portal
Panchayat College, Baragada, Odisha (Govt. of Odisha)
Generated on: ${new Date().toLocaleString()}
==================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${item.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    if (onAuditLog) {
      onAuditLog('DOWNLOAD_DOCUMENT', `Downloaded official document: ${item.title}`);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-stone-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-700/50 border border-amber-500/30 text-amber-200 text-xs font-semibold mb-4">
            <Download className="w-3.5 h-3.5" />
            <span>SAMS Official Resource Repository</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight mb-3">
            Downloads & Official Documents
          </h2>
          <p className="text-amber-100/90 text-sm sm:text-base leading-relaxed">
            Access and download official SAMS e-Admission prospectuses, academic calendars, fee structures, application forms, and compliance documents for SAMS Panchayat College, Baragada.
          </p>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border border-amber-200/60 dark:border-stone-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterCategory === cat
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-amber-100/60 dark:hover:bg-stone-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-stone-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 w-full md:w-64"
          />
          {(userRole === 'admin' || userRole === 'hod') && (
            <button
              onClick={() => setIsAddingModal(true)}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Document</span>
            </button>
          )}
        </div>
      </div>

      {/* Downloads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDownloads.map(item => (
          <div
            key={item.id}
            className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-md border border-amber-200 dark:border-stone-800 hover:shadow-xl transition-all flex flex-col justify-between relative group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 bg-amber-50 dark:bg-stone-800 text-amber-800 dark:text-amber-400 text-xs font-bold rounded-lg border border-amber-200/60 dark:border-stone-700">
                  {item.category}
                </span>
                <span className="text-xs text-stone-500 font-mono font-medium">
                  {item.fileSize}
                </span>
              </div>
              <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 mb-2 group-hover:text-amber-700 transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-4">
                {item.description}
              </p>
            </div>

            <div className="pt-4 border-t border-amber-100 dark:border-stone-800 flex items-center justify-between">
              <div className="text-[11px] text-stone-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                <span>Updated: {item.uploadDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleInitiateDelete(item.id, item.title)}
                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                  title="Delete document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDownloadItem(item, e)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Download document"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredDownloads.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white dark:bg-stone-900 rounded-3xl border border-amber-200 dark:border-stone-800">
            <FileText className="w-12 h-12 text-amber-700 mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200">No documents found</h3>
            <p className="text-xs text-stone-500 mt-1">Try adjusting your search query or selected category filter.</p>
          </div>
        )}
      </div>

      {/* Add Document Modal for Admin */}
      {isAddingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-200 dark:border-stone-800 animate-scaleUp">
            <div className="flex items-center justify-between mb-4 border-b border-amber-100 dark:border-stone-800 pb-3">
              <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-700" />
                <span>Add Official Download Document</span>
              </h3>
              <button
                onClick={() => setIsAddingModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDownload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Merit List Guidelines 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">File Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 2.4 MB"
                    value={newFileSize}
                    onChange={(e) => setNewFileSize(e.target.value)}
                    className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">Document Source Type</label>
                <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-semibold mb-3">
                  <button
                    type="button"
                    onClick={() => setUploadMode('url')}
                    className={`flex-1 py-2 rounded-lg transition-all ${uploadMode === 'url' ? 'bg-amber-700 text-white shadow-xs' : 'text-stone-600 dark:text-stone-300'}`}
                  >
                    Link External URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('file')}
                    className={`flex-1 py-2 rounded-lg transition-all ${uploadMode === 'file' ? 'bg-amber-700 text-white shadow-xs' : 'text-stone-600 dark:text-stone-300'}`}
                  >
                    Upload Photo / PDF
                  </button>
                </div>

                {uploadMode === 'url' ? (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Document URL *</label>
                    <input
                      type="url"
                      required={uploadMode === 'url'}
                      placeholder="https://..."
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Select Photo or PDF File *</label>
                    <input
                      type="file"
                      required={uploadMode === 'file'}
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setSelectedFile(e.target.files[0]);
                          setNewFileSize((e.target.files[0].size / (1024 * 1024)).toFixed(1) + ' MB');
                        }
                      }}
                      className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-900 dark:file:bg-stone-700 dark:file:text-amber-300 hover:file:bg-amber-200 cursor-pointer"
                    />
                    {selectedFile && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                        Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Short description of document contents..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-amber-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAddingModal(false)}
                  className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-xl shadow-md"
                >
                  Upload Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-200 dark:border-stone-800 animate-scaleUp">
            <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 mb-2">Confirm Document Deletion</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mb-6">
              Are you sure you want to delete <strong className="text-stone-900 dark:text-stone-100">"{deletingItem.title}"</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  CloudUpload, 
  CloudDownload, 
  Database, 
  Trash2, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  HardDrive, 
  FileJson, 
  ShieldCheck, 
  Calendar, 
  Layers, 
  Users, 
  BookOpen, 
  Upload
} from 'lucide-react';
import { 
  listGoogleDriveBackups, 
  uploadGoogleDriveBackup, 
  downloadGoogleDriveBackup, 
  deleteGoogleDriveBackup, 
  DriveBackupFile, 
  SystemBackupPayload 
} from '../utils/googleDriveBackupService';

interface GoogleDriveBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: 'admin' | 'hod' | 'student' | null;
  userInfo: { name: string; email: string } | null;
  getCurrentSystemPayload: () => SystemBackupPayload;
  onRestoreSystemData: (payload: SystemBackupPayload) => Promise<void>;
}

export const GoogleDriveBackupModal: React.FC<GoogleDriveBackupModalProps> = ({
  isOpen,
  onClose,
  userRole,
  userInfo,
  getCurrentSystemPayload,
  onRestoreSystemData
}) => {
  const [backups, setBackups] = useState<DriveBackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Confirmation Modal States for Mutating Operations
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<{ file: DriveBackupFile; payload?: SystemBackupPayload } | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<DriveBackupFile | null>(null);
  const [selectedBackupPreview, setSelectedBackupPreview] = useState<SystemBackupPayload | null>(null);

  useEffect(() => {
    if (isOpen && userRole === 'admin') {
      fetchBackupsList();
    }
  }, [isOpen, userRole]);

  if (!isOpen) return null;

  if (userRole !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-stone-900 border border-red-300 dark:border-red-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-950 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100">Access Restricted</h3>
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Google Drive Backup and Restore is strictly restricted to Super Admin only.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-800 text-white text-sm font-semibold rounded-xl hover:bg-stone-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const fetchBackupsList = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const driveFiles = await listGoogleDriveBackups();
      setBackups(driveFiles);
    } catch (err: any) {
      console.error('Failed to list backups:', err);
      setStatusMessage({
        type: 'info',
        text: 'Sign in or authorize Google Drive access to view and create cloud backups.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const payload = getCurrentSystemPayload();
      const newFile = await uploadGoogleDriveBackup(payload);
      setStatusMessage({
        type: 'success',
        text: `Successfully created backup "${newFile.name}" on Google Drive!`
      });
      await fetchBackupsList();
    } catch (err: any) {
      console.error('Failed to create backup:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to create backup on Google Drive.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrepareRestore = async (file: DriveBackupFile) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const payload = await downloadGoogleDriveBackup(file.id);
      setSelectedBackupPreview(payload);
      setConfirmRestoreFile({ file, payload });
    } catch (err: any) {
      console.error('Failed to prepare restore:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to download backup payload for restore.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!confirmRestoreFile?.payload) return;
    
    setActionLoading(true);
    try {
      await onRestoreSystemData(confirmRestoreFile.payload);
      setStatusMessage({
        type: 'success',
        text: `System database and configurations restored successfully from "${confirmRestoreFile.file.name}"!`
      });
      setConfirmRestoreFile(null);
      setSelectedBackupPreview(null);
    } catch (err: any) {
      console.error('Restore error:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to restore system data.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!confirmDeleteFile) return;

    setActionLoading(true);
    try {
      await deleteGoogleDriveBackup(confirmDeleteFile.id);
      setStatusMessage({
        type: 'success',
        text: `Deleted backup file "${confirmDeleteFile.name}" from Google Drive.`
      });
      setConfirmDeleteFile(null);
      await fetchBackupsList();
    } catch (err: any) {
      console.error('Delete error:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to delete backup file from Google Drive.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLocalFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const payload: SystemBackupPayload = JSON.parse(reader.result as string);
        if (!payload.data && !Array.isArray((payload as any).students)) {
          throw new Error('Invalid backup file structure.');
        }
        setConfirmRestoreFile({
          file: { id: 'local-file', name: file.name, createdTime: new Date(file.lastModified).toISOString() },
          payload
        });
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: 'Selected file is not a valid JSON system backup payload.'
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden p-6 sm:p-8 space-y-6 animate-fade-in relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-700 to-orange-800 text-white rounded-2xl shadow-md">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                  Google Drive Backup & Restore
                </h2>
                <span className="px-2 py-0.5 bg-amber-700/10 text-amber-800 dark:text-amber-400 text-[10px] font-bold rounded uppercase">
                  Admin Exclusive
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Securely store, manage, and restore full college database snapshots on Google Drive.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className={`p-4 rounded-2xl text-xs sm:text-sm font-medium flex items-start gap-3 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Action Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 dark:bg-stone-800/60 p-4 rounded-2xl border border-stone-200 dark:border-stone-700">
          <div>
            <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
              Create New Cloud Backup
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Upload current student database, applications, seat matrix, and HOD configs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateBackup}
              disabled={actionLoading}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
              <span>Backup to Google Drive</span>
            </button>

            <button
              onClick={fetchBackupsList}
              disabled={loading}
              className="p-2.5 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 rounded-xl transition-colors"
              title="Refresh Google Drive Backups List"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Backups List Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-700" />
              <span>Google Drive Cloud Backups ({backups.length})</span>
            </h4>
            <label className="text-xs text-amber-800 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1 font-semibold">
              <Upload className="w-3.5 h-3.5" />
              <span>Import Local JSON File</span>
              <input type="file" accept=".json" onChange={handleLocalFileRestore} className="hidden" />
            </label>
          </div>

          {loading ? (
            <div className="py-12 text-center text-stone-500 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-700" />
              <span>Loading Google Drive backups...</span>
            </div>
          ) : backups.length === 0 ? (
            <div className="py-10 px-4 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl space-y-2">
              <FileJson className="w-10 h-10 text-stone-400 mx-auto" />
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                No Google Drive Backups Found
              </p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Click "Backup to Google Drive" above to create your first cloud database backup snapshot.
              </p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
              {backups.map((file) => (
                <div 
                  key={file.id} 
                  className="p-3.5 bg-stone-50 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-3 hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2.5 bg-amber-100 dark:bg-stone-700 text-amber-800 dark:text-amber-300 rounded-xl flex-shrink-0">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <h5 className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                        {file.name}
                      </h5>
                      <div className="flex items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          {file.createdTime ? new Date(file.createdTime).toLocaleString() : 'N/A'}
                        </span>
                        {file.size && (
                          <span>({(parseInt(file.size, 10) / 1024).toFixed(1)} KB)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handlePrepareRestore(file)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      title="Restore System Data from this Backup"
                    >
                      <CloudDownload className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>

                    <button
                      onClick={() => setConfirmDeleteFile(file)}
                      disabled={actionLoading}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      title="Delete Backup from Google Drive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Explicit Confirmation Dialog for Data Restore (MANDATORY per Workspace guidelines) */}
        {confirmRestoreFile && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-stone-900 border border-amber-300 dark:border-stone-700 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-fade-in">
              <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
                <div className="p-3 bg-amber-100 dark:bg-amber-950 rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
                    Confirm System Data Restore
                  </h3>
                  <p className="text-xs text-stone-500">
                    Overwriting current system database with Google Drive backup
                  </p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-stone-800/90 rounded-2xl border border-amber-200 dark:border-stone-700 space-y-3 text-xs">
                <p className="text-stone-700 dark:text-stone-300 font-medium">
                  Are you sure you want to restore the system state from file <strong className="text-amber-800 dark:text-amber-300">{confirmRestoreFile.file.name}</strong>?
                </p>

                {confirmRestoreFile.payload && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/80 dark:border-stone-700">
                    <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
                      <Users className="w-3.5 h-3.5 text-amber-700" />
                      <span>Students: <strong>{confirmRestoreFile.payload.summary?.studentsCount ?? (confirmRestoreFile.payload.data?.students?.length || 0)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
                      <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                      <span>Applications: <strong>{confirmRestoreFile.payload.summary?.applicationsCount ?? (confirmRestoreFile.payload.data?.applications?.length || 0)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
                      <Layers className="w-3.5 h-3.5 text-amber-700" />
                      <span>Faculty: <strong>{confirmRestoreFile.payload.summary?.facultyCount ?? (confirmRestoreFile.payload.data?.faculty?.length || 0)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                      <span>Created By: <strong>{confirmRestoreFile.payload.createdBy || 'Admin'}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleExecuteRestore}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Confirm & Restore All System Data</span>
                </button>

                <button
                  onClick={() => {
                    setConfirmRestoreFile(null);
                    setSelectedBackupPreview(null);
                  }}
                  disabled={actionLoading}
                  className="py-2.5 px-4 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Explicit Confirmation Dialog for File Deletion */}
        {confirmDeleteFile && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-stone-900 border border-red-200 dark:border-stone-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in">
              <div className="flex items-center gap-3 text-red-600">
                <div className="p-3 bg-red-100 dark:bg-red-950 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
                    Delete Google Drive Backup?
                  </h3>
                  <p className="text-xs text-stone-500">
                    This file will be permanently removed from Google Drive.
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-300">
                Are you sure you want to delete <strong className="text-stone-900 dark:text-stone-100">{confirmDeleteFile.name}</strong> from your Google Drive storage?
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleExecuteDelete}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>Delete File from Drive</span>
                </button>

                <button
                  onClick={() => setConfirmDeleteFile(null)}
                  disabled={actionLoading}
                  className="py-2.5 px-4 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

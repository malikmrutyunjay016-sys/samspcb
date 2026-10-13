import React from 'react';
import { 
  GraduationCap, 
  Shield, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Database, 
  Users, 
  BookOpen, 
  Activity, 
  FileSpreadsheet, 
  Layers, 
  BarChart3, 
  Download, 
  PhoneCall,
  Camera,
  Upload,
  Trash2,
  Check,
  Image as ImageIcon,
  Sparkles,
  KeyRound,
  HardDrive
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: 'admin' | 'hod' | 'student' | null;
  userInfo: { name: string; email: string; deptId?: string } | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  isSpotRoundEnabled: boolean;
  onToggleSpotRound?: (enabled: boolean) => void;
  collegeLogoUrl?: string;
  onUpdateCollegeLogo?: (logoUrl: string) => void;
  onOpenBackupModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  userInfo,
  onOpenLogin,
  onLogout,
  isSpotRoundEnabled,
  onToggleSpotRound,
  collegeLogoUrl = '',
  onUpdateCollegeLogo,
  onOpenBackupModal
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = React.useState(false);
  const [customUrlInput, setCustomUrlInput] = React.useState('');
  const [previewUrl, setPreviewUrl] = React.useState(collegeLogoUrl || '');
  const [uploadError, setUploadError] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setPreviewUrl(collegeLogoUrl || '');
  }, [collegeLogoUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image size exceeds 2MB limit. Please choose a smaller file.');
      return;
    }

    setUploadError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewUrl(reader.result);
        setCustomUrlInput('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = () => {
    if (onUpdateCollegeLogo) {
      onUpdateCollegeLogo(previewUrl);
    }
    setIsLogoModalOpen(false);
  };

  const handleResetToDefault = () => {
    setPreviewUrl('');
    setCustomUrlInput('');
    setUploadError('');
    if (onUpdateCollegeLogo) {
      onUpdateCollegeLogo('');
    }
    setIsLogoModalOpen(false);
  };

  const showSpotRoundTab = isSpotRoundEnabled || userRole === 'admin';

  const navItems = [
    { id: 'home', label: 'Home', icon: GraduationCap },
    ...(userRole === 'admin' ? [{ id: 'students', label: 'Student Database', icon: Database }] : []),
    { id: 'faculty', label: 'Faculty Directory', icon: Users },
    { id: 'hod-portal', label: 'HOD / Department', icon: Shield },
    { id: 'sams-stats', label: 'SAMS Statistics', icon: BarChart3 },
    { id: 'seat-matrix', label: 'Subjects & Seat Matrix', icon: Layers, badge: 'SAMS' },
    ...(showSpotRoundTab ? [{ 
      id: 'spot-round', 
      label: 'Spot Round Seats', 
      icon: Activity, 
      badge: !isSpotRoundEnabled && userRole === 'admin' ? 'DISABLED' : 'LIVE' 
    }] : []),
    { id: 'downloads', label: 'Downloads', icon: Download },
    { id: 'contact', label: 'Contact Us', icon: PhoneCall },
    ...(userRole === 'admin' ? [{ id: 'audit', label: 'Audit Logs', icon: FileSpreadsheet }] : [])
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-stone-900/95 backdrop-blur-md border-b border-amber-100 dark:border-stone-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('home')}>
            <div className="relative">
              <div 
                className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-700 to-orange-800 flex items-center justify-center text-white shadow-md border-2 border-amber-600/40 dark:border-amber-500/50 overflow-hidden transform hover:scale-105 transition-all"
                title={userRole === 'admin' ? 'College Logo (Click camera badge to change)' : 'SAMS Panchayat College Logo'}
              >
                {collegeLogoUrl ? (
                  <img 
                    src={collegeLogoUrl} 
                    alt="SAMS College Logo" 
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <GraduationCap className="w-6 h-6" />
                )}
              </div>

              {/* Admin Quick Edit Button */}
              {userRole === 'admin' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewUrl(collegeLogoUrl || '');
                    setCustomUrlInput('');
                    setUploadError('');
                    setIsLogoModalOpen(true);
                  }}
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-600 hover:bg-amber-700 text-white rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-stone-900 transition-transform hover:scale-110"
                  title="Admin: Change College Logo"
                  aria-label="Edit College Logo"
                >
                  <Camera className="w-3 h-3" />
                </button>
              )}
            </div>

            <div>
              <h1 className="text-lg sm:text-xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                SAMS PANCHAYAT COLLEGE
              </h1>
              <p className="text-xs text-amber-800 dark:text-amber-400 font-medium tracking-wide">
                BARAGADA • GOVT OF ODISHA PORTAL
              </p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-amber-700 text-white shadow-md'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-amber-100/60 dark:hover:bg-stone-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded-full animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Auth / Login button */}
          <div className="hidden sm:flex items-center gap-3">
            {userRole === 'admin' && (
              <div className="flex items-center gap-2">
                {onToggleSpotRound && (
                  <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800/90 px-3 py-1.5 rounded-2xl border border-amber-300 dark:border-stone-700 text-xs shadow-xs">
                    <span className="text-stone-700 dark:text-stone-300 font-semibold flex items-center gap-1 text-[11px]">
                      <Activity className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                      <span>Spot Round Tab:</span>
                    </span>
                    <button
                      onClick={() => onToggleSpotRound(!isSpotRoundEnabled)}
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wider transition-all shadow-xs ${
                        isSpotRoundEnabled
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                      title={isSpotRoundEnabled ? 'Click to Disable Spot Round Tab for HOD/Public' : 'Click to Enable Spot Round Tab for Public'}
                    >
                      {isSpotRoundEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setActiveTab('hod-portal')}
                  className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-2xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors border border-amber-600/50"
                  title="Open HOD Account IDs & Security Passwords Manager"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                  <span>HOD Credentials</span>
                </button>

                {onOpenBackupModal && (
                  <button
                    onClick={onOpenBackupModal}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white rounded-2xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all border border-amber-500/50"
                    title="Google Drive Backup & Restore (Super Admin Only)"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-amber-200" />
                    <span>Drive Backup</span>
                  </button>
                )}
              </div>
            )}

            {userRole ? (
              <div className="flex items-center gap-3 bg-amber-50 dark:bg-stone-800 px-3 py-1.5 rounded-2xl border border-amber-200 dark:border-stone-700">
                <div className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center font-bold text-sm">
                  {userRole === 'admin' ? 'SA' : (userInfo?.name ? userInfo.name[0].toUpperCase() : 'U')}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate max-w-[160px]">
                    {userRole === 'admin' ? (userInfo?.name || 'Super Admin') : (userInfo?.name || 'User')}
                  </p>
                  <span className="inline-block px-1.5 py-0.2 bg-amber-700/10 text-amber-800 dark:text-amber-400 text-[10px] uppercase font-bold rounded">
                    {userRole === 'admin' ? 'SUPER ADMIN' : userRole}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-1.5 text-stone-500 hover:text-red-600 transition-colors ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-4 py-2 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>Super Admin / Portal Login</span>
              </button>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-amber-100 dark:hover:bg-stone-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-amber-50 dark:bg-stone-900 border-b border-amber-200 dark:border-stone-800 px-4 pt-2 pb-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                  isActive
                    ? 'bg-amber-700 text-white'
                    : 'text-stone-700 dark:text-stone-200 hover:bg-amber-200/50 dark:hover:bg-stone-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2 border-t border-amber-200 dark:border-stone-800 space-y-2">
            {userRole === 'admin' && onToggleSpotRound && (
              <div className="flex items-center justify-between px-4 py-2 bg-stone-100 dark:bg-stone-800 rounded-xl">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Spot Round Tab Status:
                </span>
                <button
                  onClick={() => onToggleSpotRound(!isSpotRoundEnabled)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isSpotRoundEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {isSpotRoundEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            )}
            {userRole ? (
              <div className="flex items-center justify-between px-4 py-2">
                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">{userRole === 'admin' ? 'Admin' : userInfo?.name}</p>
                  <p className="text-xs text-amber-800 uppercase font-bold">{userRole}</p>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-lg"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onOpenLogin();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 bg-amber-700 text-white text-sm font-semibold rounded-xl text-center"
              >
                Admin / Portal Login
              </button>
            )}
          </div>
        </div>
      )}
      {/* Admin College Logo Upload & Edit Modal */}
      {isLogoModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden p-6 sm:p-7 space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 dark:bg-stone-800 text-amber-800 dark:text-amber-300 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
                    Edit College Logo
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    SAMS Panchayat College Header Emblem
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLogoModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Round Logo Preview */}
            <div className="flex flex-col items-center justify-center gap-3 py-2">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-700 to-orange-800 flex items-center justify-center text-white shadow-xl border-4 border-amber-300 dark:border-amber-600/50 overflow-hidden">
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt="Logo Preview" 
                      className="w-full h-full object-cover rounded-full"
                      onError={() => setUploadError('Failed to load image from provided source.')}
                    />
                  ) : (
                    <GraduationCap className="w-12 h-12" />
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-amber-600 text-white text-[9px] font-bold rounded-full shadow">
                  Preview
                </span>
              </div>
              <p className="text-xs text-stone-500 text-center">
                This logo will be displayed across the header in circular format.
              </p>
            </div>

            {uploadError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs rounded-xl">
                {uploadError}
              </div>
            )}

            {/* Method 1: Upload Image File */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                1. Upload Image File from Device:
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-dashed border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span>Choose Image (.png, .jpg, .svg, .webp)</span>
              </button>
            </div>

            {/* Method 2: Image URL */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                2. Or Enter Logo Image URL:
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => {
                    setCustomUrlInput(e.target.value);
                    setPreviewUrl(e.target.value.trim());
                    setUploadError('');
                  }}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveLogo}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Save College Logo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsLogoModalOpen(false)}
                  className="py-2.5 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>

              {(collegeLogoUrl || previewUrl) && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="w-full py-2 text-stone-500 hover:text-red-600 dark:hover:text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset to Default College Emblem</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </header>
  );
};

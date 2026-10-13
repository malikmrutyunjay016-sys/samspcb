import React, { useState, useEffect } from 'react';
import { PhoneCall, Mail, MapPin, Clock, Send, CheckCircle2, Building2, UserCheck, MessageSquare, Trash2, Plus, Edit, X } from 'lucide-react';
import { db, collection, onSnapshot, setDoc, doc, deleteDoc } from '../firebase';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  message: string;
  date: string;
  status: 'Unread' | 'Resolved';
}

interface KeyOfficer {
  id: string;
  title: string;
  name: string;
  email: string;
  phone: string;
}

interface ContactUsViewProps {
  userRole: 'admin' | 'hod' | 'student' | null;
  onAuditLog?: (action: string, details: string) => void;
}

const DEFAULT_KEY_OFFICERS: KeyOfficer[] = [
  {
    id: 'off-1',
    title: 'Principal & Chairman',
    name: 'Dr. R. K. Mishra',
    email: 'principal@samsPanchayatcollege.ac.in',
    phone: '+91 6646-234567'
  },
  {
    id: 'off-2',
    title: 'SAMS Admission In-Charge',
    name: 'Prof. B. S. Meher',
    email: 'admissions@samsPanchayatcollege.ac.in',
    phone: '+91 6646-234568'
  }
];

const DEFAULT_MESSAGES: ContactMessage[] = [
  {
    id: 'msg-1',
    name: 'Soumya Ranjan Das',
    email: 'soumya.das@gmail.com',
    phone: '9876543210',
    category: 'Admission Inquiry',
    message: 'Respected Sir, when will the 2nd round spot admission merit list be published for B.Sc Physics Honours?',
    date: '2026-10-08 14:20',
    status: 'Resolved'
  },
  {
    id: 'msg-2',
    name: 'Priyanka Priyadarsini',
    email: 'priyanka.p@yahoo.com',
    phone: '9123456780',
    category: 'Spot Round',
    message: 'Can I apply for spot round admission if my name was not in the first selection list?',
    date: '2026-10-09 10:15',
    status: 'Unread'
  }
];

export const ContactUsView: React.FC<ContactUsViewProps> = ({ userRole, onAuditLog }) => {
  const [messages, setMessages] = useState<ContactMessage[]>(() => {
    try {
      const saved = localStorage.getItem('SAMS_CONTACT_INQUIRIES');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not load contact messages from cache:', e);
    }
    return DEFAULT_MESSAGES;
  });

  const [officers, setOfficers] = useState<KeyOfficer[]>(() => {
    try {
      const saved = localStorage.getItem('SAMS_KEY_OFFICERS');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not load key officers from cache:', e);
    }
    return DEFAULT_KEY_OFFICERS;
  });

  // Real-time Cloud Sync with Firestore
  useEffect(() => {
    // 1. Subscribe to keyOfficers collection
    const unsubOfficers = onSnapshot(collection(db, 'keyOfficers'), async (snap) => {
      if (snap.empty) {
        // Seed default key officers to Firestore if empty
        for (const off of DEFAULT_KEY_OFFICERS) {
          await setDoc(doc(db, 'keyOfficers', off.id), off).catch(console.warn);
        }
        setOfficers(DEFAULT_KEY_OFFICERS);
      } else {
        const loaded: KeyOfficer[] = [];
        snap.forEach((d) => loaded.push({ id: d.id, ...d.data() } as KeyOfficer));
        setOfficers(loaded);
        localStorage.setItem('SAMS_KEY_OFFICERS', JSON.stringify(loaded));
      }
    }, (err) => console.warn('keyOfficers Firestore listener notice:', err));

    // 2. Subscribe to contactInquiries collection
    const unsubInquiries = onSnapshot(collection(db, 'contactInquiries'), async (snap) => {
      if (snap.empty) {
        for (const msg of DEFAULT_MESSAGES) {
          await setDoc(doc(db, 'contactInquiries', msg.id), msg).catch(console.warn);
        }
        setMessages(DEFAULT_MESSAGES);
      } else {
        const loaded: ContactMessage[] = [];
        snap.forEach((d) => loaded.push({ id: d.id, ...d.data() } as ContactMessage));
        // Sort newest first
        loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setMessages(loaded);
        localStorage.setItem('SAMS_CONTACT_INQUIRIES', JSON.stringify(loaded));
      }
    }, (err) => console.warn('contactInquiries Firestore listener notice:', err));

    return () => {
      unsubOfficers();
      unsubInquiries();
    };
  }, []);

  // Modal state for Key Officers
  const [isOfficerModalOpen, setIsOfficerModalOpen] = useState(false);
  const [editingOfficerId, setEditingOfficerId] = useState<string | null>(null);
  const [officerTitle, setOfficerTitle] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [officerEmail, setOfficerEmail] = useState('');
  const [officerPhone, setOfficerPhone] = useState('');

  // Contact form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCategory, setFormCategory] = useState('Admission Inquiry');
  const [formMessage, setFormMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formMessage.trim()) return;

    const newMsg: ContactMessage = {
      id: 'msg-' + Date.now(),
      name: formName.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim() || 'N/A',
      category: formCategory,
      message: formMessage.trim(),
      date: new Date().toLocaleString(),
      status: 'Unread'
    };

    const updated = [newMsg, ...messages];
    setMessages(updated);
    localStorage.setItem('SAMS_CONTACT_INQUIRIES', JSON.stringify(updated));

    // Save to Firestore so all devices see the inquiry in real time!
    await setDoc(doc(db, 'contactInquiries', newMsg.id), newMsg).catch(console.warn);

    if (onAuditLog) {
      onAuditLog('SUBMIT_CONTACT_INQUIRY', `Received inquiry from ${newMsg.name} (${newMsg.category})`);
    }

    setSubmitted(true);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormMessage('');

    setTimeout(() => setSubmitted(false), 5000);
  };

  const handleToggleStatus = async (id: string) => {
    const target = messages.find((m) => m.id === id);
    if (!target) return;
    const newStatus = target.status === 'Unread' ? ('Resolved' as const) : ('Unread' as const);
    const updated = messages.map((m) => (m.id === id ? { ...m, status: newStatus } : m));
    setMessages(updated);
    localStorage.setItem('SAMS_CONTACT_INQUIRIES', JSON.stringify(updated));

    await setDoc(doc(db, 'contactInquiries', id), { ...target, status: newStatus }, { merge: true }).catch(console.warn);
  };

  const handleDeleteMessage = async (id: string) => {
    const updated = messages.filter((m) => m.id !== id);
    setMessages(updated);
    localStorage.setItem('SAMS_CONTACT_INQUIRIES', JSON.stringify(updated));

    await deleteDoc(doc(db, 'contactInquiries', id)).catch(console.warn);

    if (onAuditLog) {
      onAuditLog('DELETE_CONTACT_INQUIRY', `Deleted contact inquiry ID ${id}`);
    }
  };

  // Key Officer Handlers
  const handleOpenAddOfficer = () => {
    setEditingOfficerId(null);
    setOfficerTitle('');
    setOfficerName('');
    setOfficerEmail('');
    setOfficerPhone('');
    setIsOfficerModalOpen(true);
  };

  const handleOpenEditOfficer = (off: KeyOfficer) => {
    setEditingOfficerId(off.id);
    setOfficerTitle(off.title);
    setOfficerName(off.name);
    setOfficerEmail(off.email);
    setOfficerPhone(off.phone);
    setIsOfficerModalOpen(true);
  };

  const handleSaveOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerTitle.trim() || !officerName.trim()) return;

    let targetOfficer: KeyOfficer;
    if (editingOfficerId) {
      targetOfficer = {
        id: editingOfficerId,
        title: officerTitle.trim(),
        name: officerName.trim(),
        email: officerEmail.trim(),
        phone: officerPhone.trim()
      };
      if (onAuditLog) {
        onAuditLog('UPDATE_KEY_OFFICER', `Updated key officer: ${officerTitle} - ${officerName}`);
      }
    } else {
      targetOfficer = {
        id: 'off-' + Date.now(),
        title: officerTitle.trim(),
        name: officerName.trim(),
        email: officerEmail.trim(),
        phone: officerPhone.trim()
      };
      if (onAuditLog) {
        onAuditLog('ADD_KEY_OFFICER', `Added key officer: ${officerTitle} - ${officerName}`);
      }
    }

    await setDoc(doc(db, 'keyOfficers', targetOfficer.id), targetOfficer).catch(console.warn);
    setIsOfficerModalOpen(false);
  };

  const handleDeleteOfficer = async (id: string, name: string) => {
    await deleteDoc(doc(db, 'keyOfficers', id)).catch(console.warn);
    if (onAuditLog) {
      onAuditLog('DELETE_KEY_OFFICER', `Deleted key officer: ${name}`);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-stone-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-700/50 border border-amber-500/30 text-amber-200 text-xs font-semibold mb-4">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>SAMS Helpdesk & Support</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight mb-3">
            Contact Us
          </h2>
          <p className="text-amber-100/90 text-sm sm:text-base leading-relaxed">
            Get in touch with the SAMS Admission Cell and administrative departments at SAMS Panchayat College, Baragada. We are here to assist applicants, students, and parents.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Contact Cards */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-md border border-amber-200 dark:border-stone-800 space-y-6">
            <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2 border-b border-amber-100 dark:border-stone-800 pb-3">
              <Building2 className="w-5 h-5 text-amber-700" />
              <span>Institution Office</span>
            </h3>

            <div className="space-y-4 text-xs text-stone-700 dark:text-stone-300">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-stone-900 dark:text-stone-100">SAMS Panchayat College, Baragada</p>
                  <p className="text-stone-500 mt-0.5">P.O. Baragada, District - Bargarh, Odisha, PIN - 768036</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <PhoneCall className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <div>
                  <p className="font-bold text-stone-900 dark:text-stone-100">Helpline Phone</p>
                  <p className="text-stone-500">+91 6646-234567 / 234568</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <div>
                  <p className="font-bold text-stone-900 dark:text-stone-100">Official Email</p>
                  <p className="text-stone-500">samspanchayatcollege@odisha.gov.in</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <div>
                  <p className="font-bold text-stone-900 dark:text-stone-100">Office Hours</p>
                  <p className="text-stone-500">Mon - Sat: 10:00 AM – 5:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-800 to-orange-900 text-white rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold tracking-wide uppercase text-amber-200">Key Officers</h4>
              {userRole === 'admin' && (
                <button
                  onClick={handleOpenAddOfficer}
                  className="px-2.5 py-1 bg-amber-700/80 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all border border-amber-500/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Officer</span>
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              {officers.map(off => (
                <div key={off.id} className="bg-amber-950/40 p-3.5 rounded-2xl border border-amber-700/30 space-y-1.5 relative group">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-white">{off.title}</p>
                      <p className="text-amber-200 mt-0.5 font-medium">{off.name}</p>
                    </div>
                    {userRole === 'admin' && (
                      <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditOfficer(off)}
                          className="p-1 text-amber-200 hover:text-white bg-amber-900/60 rounded-lg"
                          title="Edit Officer"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteOfficer(off.id, off.name)}
                          className="p-1 text-amber-300 hover:text-red-300 bg-amber-900/60 rounded-lg"
                          title="Delete Officer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-stone-300 text-[11px]">{off.email}</p>
                  {off.phone && <p className="text-stone-400 text-[11px]">Phone: {off.phone}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Contact Inquiry Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 shadow-md border border-amber-200 dark:border-stone-800">
            <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-700" />
              <span>Send an Inquiry / Message</span>
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mb-6">
              Have questions regarding SAMS e-Admission, merit lists, or spot rounds? Fill out the form below and our helpdesk team will respond promptly.
            </p>

            {submitted && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-semibold flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>Your inquiry has been submitted successfully! SAMS Helpdesk will review and respond shortly.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="rahul@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Inquiry Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  >
                    <option value="Admission Inquiry">Admission Inquiry</option>
                    <option value="Spot Round">Spot Round Seats</option>
                    <option value="Fee & Payment">Fee & Payment Query</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="General Query">General Query</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Your Message *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe your inquiry in detail..."
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Inquiry</span>
                </button>
              </div>
            </form>
          </div>

          {/* Admin Inquiry Inbox */}
          {userRole === 'admin' && (
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-md border border-amber-200 dark:border-stone-800 space-y-4">
              <div className="flex items-center justify-between border-b border-amber-100 dark:border-stone-800 pb-3">
                <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-700" />
                  <span>Admin Inbox: Contact Inquiries ({messages.length})</span>
                </h4>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <p className="text-xs text-stone-500 py-6 text-center">No contact inquiries found.</p>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-amber-200/60 dark:border-stone-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-stone-900 dark:text-stone-100">{msg.name}</span>
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-stone-700 text-amber-800 dark:text-amber-300 text-[10px] font-bold rounded">
                            {msg.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(msg.id)}
                            className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg transition-all ${
                              msg.status === 'Resolved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}
                          >
                            {msg.status}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                            title="Delete Inquiry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed bg-white dark:bg-stone-900 p-3 rounded-xl border border-amber-100 dark:border-stone-800">
                        {msg.message}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                        <span>Email: {msg.email} | Phone: {msg.phone}</span>
                        <span>{msg.date}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Key Officer Modal */}
      {isOfficerModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-md:w-full max-w-md p-6 shadow-2xl border border-amber-200 dark:border-stone-800 space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-amber-100 dark:border-stone-800 pb-4">
              <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">
                {editingOfficerId ? 'Edit Key Officer' : 'Add New Key Officer'}
              </h3>
              <button
                onClick={() => setIsOfficerModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOfficer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Designation / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Principal & Chairman"
                  value={officerTitle}
                  onChange={(e) => setOfficerTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Officer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. R. K. Mishra"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Official Email *</label>
                <input
                  type="email"
                  required
                  placeholder="principal@samsPanchayatcollege.ac.in"
                  value={officerEmail}
                  onChange={(e) => setOfficerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+91 6646-234567"
                  value={officerPhone}
                  onChange={(e) => setOfficerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-amber-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsOfficerModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
                >
                  {editingOfficerId ? 'Save Changes' : 'Add Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

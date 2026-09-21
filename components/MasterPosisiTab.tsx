import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Search, Plus, Trash2, Edit2, Check, X, ShieldAlert, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { PosisiStaff, getMasterPosisiConfig, saveMasterPosisi, SurveyData } from '../lib/db';

interface MasterPosisiTabProps {
  rsName: string;
  surveys?: SurveyData[];
}

const PRESET_POSISI_CATEGORIES = [
  'Manajemen',
  'Tenaga Medis',
  'Tenaga Keperawatan',
  'Tenaga Kefarmasian',
  'Tenaga Penunjang Medis',
  'Penunjang Rumah Sakit',
  'Administrasi',
  'Lainnya'
];

export default function MasterPosisiTab({ rsName, surveys = [] }: MasterPosisiTabProps) {
  const [positions, setPositions] = useState<PosisiStaff[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PosisiStaff>>({});
  
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<Partial<PosisiStaff>>({ kategori: 'Manajemen', is_active: true });

  // Modal Category State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [categoryModalTarget, setCategoryModalTarget] = useState<'add' | 'edit'>('add');
  const [categoryError, setCategoryError] = useState('');

  // Delete & Alert Modals
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; position: PosisiStaff | null }>({
    isOpen: false,
    position: null,
  });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: '',
  });

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const config = await getMasterPosisiConfig(rsName);
    setPositions(config.positions || []);
    setCustomCategories(config.customCategories || []);
    setIsLoading(false);
  }, [rsName]);

  useEffect(() => {
    if (rsName) {
      loadData();
    }
  }, [rsName, loadData]);

  const notifyMasterDataUpdated = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('master_data_updated'));
    }
  };

  const allCategories = Array.from(
    new Set([
      ...PRESET_POSISI_CATEGORIES,
      ...positions.map(p => p.kategori).filter(Boolean),
      ...customCategories
    ])
  );

  const handleSavePositions = async (newPositions: PosisiStaff[], newCustomCats: string[] = customCategories) => {
    setPositions(newPositions);
    setCustomCategories(newCustomCats);
    await saveMasterPosisi(rsName, newPositions, newCustomCats);
    notifyMasterDataUpdated();
  };

  // Open Add Category Modal
  const openCategoryModal = (target: 'add' | 'edit') => {
    setCategoryModalTarget(target);
    setNewCategoryInput('');
    setCategoryError('');
    setIsCategoryModalOpen(true);
  };

  // Submit New Category from Modal
  const handleSaveCategoryModal = async () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      setCategoryError('Nama kategori wajib diisi.');
      return;
    }

    // Validation: Check duplicate (case insensitive) for this hospital
    const exists = allCategories.some(cat => cat.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setCategoryError(`Kategori "${trimmed}" sudah ada pada akun rumah sakit ini.`);
      return;
    }

    const updatedCustomCats = Array.from(new Set([...customCategories, trimmed]));
    setCustomCategories(updatedCustomCats);

    // If currently adding or editing, select this new category
    if (categoryModalTarget === 'add') {
      setAddForm(prev => ({ ...prev, kategori: trimmed }));
    } else {
      setEditForm(prev => ({ ...prev, kategori: trimmed }));
    }

    // Persist to Supabase directly
    await handleSavePositions(positions, updatedCustomCats);

    setIsCategoryModalOpen(false);
    setNewCategoryInput('');
    setCategoryError('');
    showToast(`Kategori baru "${trimmed}" berhasil ditambahkan.`);
  };

  // Add Position
  const saveAdd = async () => {
    const nama = addForm.nama_posisi?.trim();
    const kategori = addForm.kategori?.trim() || 'Manajemen';

    if (!nama) {
      showToast('Nama posisi staf wajib diisi.', 'error');
      return;
    }

    // Validation: Duplicate name check
    const isDuplicate = positions.some(p => p.nama_posisi.toLowerCase() === nama.toLowerCase());
    if (isDuplicate) {
      showToast(`Posisi staf "${nama}" sudah ada pada akun rumah sakit ini.`, 'error');
      return;
    }

    const newPos: PosisiStaff = {
      id: `pos-${Date.now()}`,
      kategori,
      nama_posisi: nama,
      is_active: true
    };

    const updated = [...positions, newPos];
    await handleSavePositions(updated, customCategories);
    setIsAdding(false);
    setAddForm({ kategori: 'Manajemen', is_active: true });
    showToast(`Posisi staf "${nama}" berhasil ditambahkan.`);
  };

  // Edit Position
  const saveEdit = async () => {
    if (!isEditing) return;
    const nama = editForm.nama_posisi?.trim();
    const kategori = editForm.kategori?.trim();

    if (!nama || !kategori) {
      showToast('Nama posisi dan kategori wajib diisi.', 'error');
      return;
    }

    // Validation: Duplicate check ignoring current position
    const isDuplicate = positions.some(
      p => p.id !== isEditing && p.nama_posisi.toLowerCase() === nama.toLowerCase()
    );
    if (isDuplicate) {
      showToast(`Posisi staf "${nama}" sudah ada pada akun rumah sakit ini.`, 'error');
      return;
    }

    const updated = positions.map(p => p.id === isEditing ? { ...p, nama_posisi: nama, kategori } as PosisiStaff : p);
    await handleSavePositions(updated, customCategories);
    setIsEditing(null);
    showToast(`Posisi staf "${nama}" berhasil diperbarui.`);
  };

  // Toggle active status
  const toggleStatus = async (id: string) => {
    const target = positions.find(p => p.id === id);
    if (!target) return;
    const updated = positions.map(p => p.id === id ? { ...p, is_active: !p.is_active } : p);
    await handleSavePositions(updated, customCategories);
    showToast(`Status posisi "${target.nama_posisi}" diubah menjadi ${!target.is_active ? 'Aktif' : 'Nonaktif'}.`);
  };

  // Delete Validation & Handler
  const initiateDelete = (pos: PosisiStaff) => {
    // Check if used in survey data for this hospital
    const hospitalSurveys = surveys.filter(s => s.namaRs === rsName);
    const isUsed = hospitalSurveys.some(s => {
      const raw = (s.dimensiScores as any)?._rawAnswers;
      const posInRaw = raw?.posisiStaf || raw?.posisi;
      const posInScores = (s.dimensiScores as any)?.posisiStaf || (s.dimensiScores as any)?.posisi;
      const posDirect = (s as any).posisiStaf || (s as any).posisi_staf;

      return (
        posInRaw === pos.nama_posisi ||
        posInScores === pos.nama_posisi ||
        posDirect === pos.nama_posisi
      );
    });

    if (isUsed) {
      setAlertModal({
        isOpen: true,
        title: 'Tidak Dapat Menghapus Data',
        message: 'Data tidak dapat dihapus karena masih digunakan pada data survei. Silakan ubah atau hapus data survei yang menggunakan data ini terlebih dahulu.'
      });
    } else {
      setDeleteConfirmModal({
        isOpen: true,
        position: pos
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmModal.position) return;
    const target = deleteConfirmModal.position;
    const updated = positions.filter(p => p.id !== target.id);
    await handleSavePositions(updated, customCategories);
    setDeleteConfirmModal({ isOpen: false, position: null });
    showToast(`Posisi staf "${target.nama_posisi}" berhasil dihapus.`);
  };

  const filteredPositions = positions.filter(p => 
    p.nama_posisi.toLowerCase().includes(search.toLowerCase()) || 
    p.kategori.toLowerCase().includes(search.toLowerCase())
  );

  const groupedPositions = filteredPositions.reduce((acc, curr) => {
    if (!acc[curr.kategori]) acc[curr.kategori] = [];
    acc[curr.kategori].push(curr);
    return acc;
  }, {} as Record<string, PosisiStaff[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Toast Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 border ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" /> Master Posisi Staff
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Kelola daftar posisi staf dan kategori yang muncul pada form kuesioner survei rumah sakit.
            </p>
          </div>
          
          <button
            onClick={() => {
              setIsAdding(true);
              setAddForm({ kategori: allCategories[0] || 'Manajemen', is_active: true });
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" /> Tambah Posisi
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Cari posisi atau kategori..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-700 outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* Form Tambah Posisi */}
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-5 mb-6 shadow-sm"
          >
            <h4 className="text-sm font-bold text-emerald-800 mb-4 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Tambah Posisi Staf Baru
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Nama Posisi Staf <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={addForm.nama_posisi || ''}
                  onChange={e => setAddForm({...addForm, nama_posisi: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
                  placeholder="Contoh: Perawat IGD, Dokter Spesialis..."
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    Kategori <span className="text-red-500">*</span>
                  </label>
                  <button 
                    type="button"
                    onClick={() => openCategoryModal('add')}
                    className="text-emerald-700 hover:text-emerald-600 p-1 rounded-md hover:bg-emerald-100/60 transition-colors flex items-center gap-1"
                    title="Tambah Kategori Baru"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700">Tambah Kategori</span>
                  </button>
                </div>
                
                <select 
                  value={addForm.kategori || allCategories[0]}
                  onChange={e => setAddForm({...addForm, kategori: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setIsAdding(false)} 
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={saveAdd} 
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-md shadow-emerald-600/20"
              >
                Simpan
              </button>
            </div>
          </motion.div>
        )}

        {/* List Posisi Staf */}
        <div className="space-y-8">
          {Object.entries(groupedPositions).map(([group, list]) => (
            <div key={group} className="space-y-3">
              <div className="flex items-center justify-between pl-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> {group}
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">{list.length} posisi</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map(pos => (
                  <div 
                    key={pos.id}
                    className={`bg-slate-50 border ${pos.is_active ? 'border-slate-200/80' : 'border-red-100 opacity-60'} rounded-xl p-4 flex flex-col justify-between transition-colors`}
                  >
                    {isEditing === pos.id ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500">Nama Posisi</label>
                          <input 
                            type="text" 
                            value={editForm.nama_posisi || ''}
                            onChange={e => setEditForm({...editForm, nama_posisi: e.target.value})}
                            className="w-full bg-white border border-emerald-500 rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center mb-0.5">
                            <label className="text-[10px] font-semibold text-slate-500">Kategori</label>
                            <button 
                              type="button"
                              onClick={() => openCategoryModal('edit')}
                              className="text-emerald-700 hover:text-emerald-600 p-0.5 rounded transition-colors flex items-center gap-0.5"
                              title="Tambah Kategori Baru"
                            >
                              <Plus className="w-3 h-3 text-emerald-600" />
                              <span className="text-[10px] font-bold">Kategori Baru</span>
                            </button>
                          </div>
                          
                          <select 
                            value={editForm.kategori || ''}
                            onChange={e => setEditForm({...editForm, kategori: e.target.value})}
                            className="w-full bg-white border border-emerald-500 rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none cursor-pointer"
                          >
                            {allCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button onClick={() => setIsEditing(null)} className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
                          <button onClick={saveEdit} className="p-1.5 text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg"><Check className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-sm font-semibold ${pos.is_active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                            {pos.nama_posisi}
                          </span>
                          <div className="flex gap-1.5 shrink-0 ml-3">
                            <button onClick={() => { setIsEditing(pos.id); setEditForm(pos); }} className="text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => toggleStatus(pos.id)} className={`transition-colors ${pos.is_active ? 'text-slate-400 hover:text-amber-600' : 'text-amber-600 hover:text-amber-500'}`} title={pos.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                              {pos.is_active ? <ShieldAlert className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => initiateDelete(pos)} className="text-slate-400 hover:text-red-600 transition-colors" title="Hapus">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded max-w-fit font-medium border ${pos.is_active ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-slate-500 bg-slate-100 border-slate-200'}`}>
                          {pos.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filteredPositions.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p>Tidak ada posisi staf yang ditemukan.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah Kategori Baru */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" /> Tambah Kategori Baru
                </h3>
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-600">
                  Nama Kategori Baru <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => {
                    setNewCategoryInput(e.target.value);
                    if (categoryError) setCategoryError('');
                  }}
                  placeholder="Contoh: Tenaga Penunjang Khusus..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  autoFocus
                />
                {categoryError && (
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {categoryError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveCategoryModal}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Simpan Kategori
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Konfirmasi Hapus */}
      <AnimatePresence>
        {deleteConfirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600">
                <div className="p-3 bg-red-100/80 rounded-xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Konfirmasi Hapus</h3>
                  <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus data posisi staf <strong className="text-slate-800">&quot;{deleteConfirmModal.position?.nama_posisi}&quot;</strong>? Data yang dihapus tidak dapat dikembalikan.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteConfirmModal({ isOpen: false, position: null })}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-red-600/20"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Peringatan Tidak Bisa Dihapus */}
      <AnimatePresence>
        {alertModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-600">
                <div className="p-3 bg-amber-100/80 rounded-xl">
                  <ShieldAlert className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{alertModal.title}</h3>
                  <p className="text-xs text-amber-600 font-medium">Validasi Penghapusan Data</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                {alertModal.message}
              </p>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setAlertModal({ isOpen: false, title: '', message: '' })}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors shadow-md"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

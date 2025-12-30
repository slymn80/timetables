import { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import AvailabilityGrid from './AvailabilityGrid';
import { teacherService, schoolService, classService, roomService } from '../../lib/services';
import type { Teacher, School, Class, Room } from '../../types';

interface TeacherFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teacher?: Teacher | null;
}

const COLOR_PALETTE = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
  '#DC2626', '#EA580C', '#059669', '#2563EB', '#7C3AED',
  '#DB2777', '#0D9488', '#C2410C', '#4F46E5', '#65A30D',
  '#BE123C', '#B45309', '#047857', '#1D4ED8', '#6D28D9'
];

const SUBJECT_AREAS = [
  'ADALET', 'AİLE VE TÜKETİCİ HİZMETLERİ', 'ALMANCA', 'ARAPÇA', 'AYAKKABI VE SARACİYE TEKNOLOJİSİ',
  'BEDEN EĞİTİMİ', 'BİLİŞİM TEKNOLOJİLERİ', 'BİYOLOJİ', 'BİYOMEDİKAL CİHAZ TEKNOLOJİLERİ',
  'BÜRO YÖNETİMİ / BÜRO YÖNETİMİ VE YÖNETİCİ ASİSTANLIĞI', 'COĞRAFYA', 'ÇİNCE',
  'ÇOCUK GELİŞİMİ VE EĞİTİMİ', 'DENİZCİLİK', 'DİN KÜLTÜRÜ VE AHLÂK BİLGİSİ',
  'EL SANATLARI TEKNOLOJİSİ', 'ELEKTRİK – ELEKTRONİK TEKNOLOJİSİ', 'ENDÜSTRİYEL OTOMASYON TEKNOLOJİLERİ',
  'FELSEFE', 'FEN BİLİMLERİ', 'FİZİK', 'FRANSIZCA', 'GAZETECİLİK', 'GEMİ YAPIMI',
  'GIDA TEKNOLOJİSİ', 'GİYİM ÜRETİM TEKNOLOJİSİ / MODA TASARIM TEKNOLOJİLERİ', 'GÖRSEL SANATLAR',
  'GRAFİK VE FOTOĞRAF', 'GÜZELLİK VE SAÇ BAKIM HİZMETLERİ / GÜZELLİK HİZMETLERİ',
  'HALKLA İLİŞKİLER VE ORGANİZASYON HİZMETLERİ / HALKLA İLİŞKİLER', 'HARİTA-TAPU-KADASTRO',
  'HASTA VE YAŞLI HİZMETLERİ', 'HAYVAN SAĞLIĞI/ HAYVAN YETİŞTİRİCİLİĞİ VE SAĞLIĞI',
  'İLKÖĞRETİM MATEMATİK', 'İMAM- HATİP LİSESİ MESLEK DERSLERİ', 'İNGİLİZCE', 'İNŞAAT TEKNOLOJİSİ',
  'İSPANYOLCA', 'İTALYANCA', 'İTFAİYECİLİK VE YANGIN GÜVENLİĞİ', 'JAPONCA',
  'KİMYA / KİMYA TEKNOLOJİSİ', 'KONAKLAMA VE SEYAHAT HİZMETLERİ', 'KUYUMCULUK TEKNOLOJİSİ',
  'LABORATUVAR HİZMETLERİ', 'MAKİNE TEKNOLOJİSİ / MAKİNE VE TASARIM TEKNOLOJİSİ',
  'MATBAA/MATBAA TEKNOLOJİSİ', 'MATEMATİK', 'METAL TEKNOLOJİSİ', 'METALÜRJİ TEKNOLOJİSİ',
  'MOBİLYA VE İÇ MEKÂN TASARIMI', 'MOTORLU ARAÇLAR TEKNOLOJİSİ', 'MUHASEBE VE FİNANSMAN',
  'MÜZİK', 'MÜZİK ALETLERİ YAPIMI', 'OKUL ÖNCESİ', 'ÖZEL EĞİTİM', 'PAZARLAMA VE PERAKENDE',
  'PLASTİK TEKNOLOJİSİ', 'PSİKOLOJİ', 'RADYO – TELEVİZYON', 'RAYLI SİSTEMLER TEKNOLOJİSİ',
  'REHBERLİK', 'RUSÇA', 'SAĞLIK/SAĞLIK HİZMETLERİ', 'SAĞLIK BİLGİSİ', 'SANAT TARİHİ',
  'SANAT VE TASARIM / PLASTİK SANATLAR', 'SERAMİK VE CAM TEKNOLOJİSİ', 'SINIF ÖĞRETMENLİĞİ',
  'SOSYAL BİLGİLER', 'TARIM TEKNOLOJİLERİ / TARIM', 'TARİH', 'TEKNOLOJİ VE TASARIM',
  'TEKSTİL TEKNOLOJİSİ', 'TESİSAT TEKNOLOJİSİ VE İKLİMLENDİRME', 'TÜRKÇE', 'TÜRK DİLİ VE EDEBİYATI',
  'UÇAK BAKIM', 'ULAŞTIRMA HİZMETLERİ', 'YENİLENEBİLİR ENERJİ TEKNOLOJİLERİ', 'YİYECEK İÇECEK HİZMETLERİ',
  'YAŞAYAN DİLLER VE LEHÇELER', 'MADEN TEKNOLOJİSİ', 'FARSÇA', 'KORECE', 'GELENEKSEL TÜRK SANATLARI',
  'TİYATRO', 'BİLİM TARİHİ', 'BİLGİSAYAR VE ÖĞRETİM TEKNOLOJİLERİ'
].sort();

export default function TeacherForm({ isOpen, onClose, onSuccess, teacher }: TeacherFormProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedSubjectAreas, setSelectedSubjectAreas] = useState<string[]>([]);
  const [customSubjectArea, setCustomSubjectArea] = useState('');
  const [showCustomSubject, setShowCustomSubject] = useState(false);
  const [availableSubjectAreas, setAvailableSubjectAreas] = useState<string[]>([...SUBJECT_AREAS]);

  const [formData, setFormData] = useState({
    school_id: '',
    first_name: '',
    last_name: '',
    short_name: '',
    email: '',
    phone: '',
    id_number: '',
    gender: '',
    photo: '',
    is_available_for_duty: true,
    is_pregnant: false,
    has_diabetes: false,
    has_gluten_intolerance: false,
    other_health_conditions: '',
    max_hours_per_day: 8,
    max_hours_per_week: 40,
    min_hours_per_week: 0,
    max_consecutive_hours: 6,
    default_room_id: '',
    color_code: '#3B82F6',
    unavailable_slots: {} as Record<string, number[]>,
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    if (teacher) {
      setFormData({
        school_id: teacher.school_id || schools[0]?.id || '',
        first_name: teacher.first_name || '',
        last_name: teacher.last_name || '',
        short_name: teacher.short_name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        id_number: teacher.id_number || '',
        gender: teacher.gender || '',
        photo: teacher.photo || '',
        is_available_for_duty: teacher.is_available_for_duty !== undefined ? teacher.is_available_for_duty : true,
        is_pregnant: teacher.is_pregnant || false,
        has_diabetes: teacher.has_diabetes || false,
        has_gluten_intolerance: teacher.has_gluten_intolerance || false,
        other_health_conditions: teacher.other_health_conditions || '',
        max_hours_per_day: teacher.max_hours_per_day || 8,
        max_hours_per_week: teacher.max_hours_per_week || 40,
        min_hours_per_week: teacher.min_hours_per_week || 0,
        max_consecutive_hours: teacher.max_consecutive_hours || 6,
        default_room_id: teacher.default_room_id || '',
        color_code: teacher.color_code || '#3B82F6',
        unavailable_slots: teacher.unavailable_slots || {},
        is_active: teacher.is_active !== undefined ? teacher.is_active : true,
      });
      setPhotoPreview(teacher.photo || '');
      setSelectedLanguages(teacher.teaching_languages || []);
      setSelectedSubjectAreas((teacher as any).subject_areas || []);
    } else {
      setFormData({
        school_id: schools[0]?.id || '',
        first_name: '',
        last_name: '',
        short_name: '',
        email: '',
        phone: '',
        id_number: '',
        gender: '',
        photo: '',
        is_available_for_duty: true,
        is_pregnant: false,
        has_diabetes: false,
        has_gluten_intolerance: false,
        other_health_conditions: '',
        max_hours_per_day: 8,
        max_hours_per_week: 40,
        min_hours_per_week: 0,
        max_consecutive_hours: 6,
        default_room_id: '',
        color_code: '#3B82F6',
        unavailable_slots: {},
        is_active: true,
      });
      setPhotoPreview('');
      setSelectedLanguages([]);
      setSelectedSubjectAreas([]);
    }
    setError('');
  }, [teacher, isOpen, schools]);

  useEffect(() => {
    if (formData.school_id) {
      loadRooms(formData.school_id);
    }
  }, [formData.school_id]);

  // Max hours/day değiştiğinde, fazla period'ları temizle
  useEffect(() => {
    const maxHours = formData.max_hours_per_day;
    const newUnavailableSlots = { ...formData.unavailable_slots };
    let hasChanges = false;

    // Her gün için, maxHours'dan büyük period'ları kaldır
    Object.keys(newUnavailableSlots).forEach((dayKey) => {
      const filteredPeriods = newUnavailableSlots[dayKey].filter(period => period <= maxHours);
      if (filteredPeriods.length !== newUnavailableSlots[dayKey].length) {
        hasChanges = true;
        if (filteredPeriods.length === 0) {
          delete newUnavailableSlots[dayKey];
        } else {
          newUnavailableSlots[dayKey] = filteredPeriods;
        }
      }
    });

    if (hasChanges) {
      setFormData(prev => ({ ...prev, unavailable_slots: newUnavailableSlots }));
    }
  }, [formData.max_hours_per_day]);

  const loadSchools = async () => {
    try {
      const response = await schoolService.getAll();
      setSchools(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Failed to load schools:', err);
      setSchools([]);
    }
  };

  const loadRooms = async (schoolId: string) => {
    try {
      const response = await roomService.getAll(schoolId);
      setRooms(response.rooms || []);
    } catch (err) {
      console.error('Failed to load rooms:', err);
      setRooms([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData: any = {
        ...formData,
        teaching_languages: selectedLanguages,
        subject_areas: selectedSubjectAreas,
      };

      console.log('DEBUG: Selected subject areas:', selectedSubjectAreas);
      console.log('DEBUG: Submit data:', JSON.stringify(submitData, null, 2));

      // Remove empty default_room_id
      if (!submitData.default_room_id) {
        delete submitData.default_room_id;
      }

      if (teacher) {
        console.log('DEBUG: Updating teacher:', teacher.id);
        await teacherService.update(teacher.id, submitData);
      } else {
        console.log('DEBUG: Creating teacher');
        await teacherService.create(submitData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving teacher:', err);
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = (language: string) => {
    setSelectedLanguages(prev =>
      prev.includes(language)
        ? prev.filter(lang => lang !== language)
        : [...prev, language]
    );
  };

  const toggleSubjectArea = (subject: string) => {
    setSelectedSubjectAreas(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const addCustomSubjectArea = () => {
    const trimmedSubject = customSubjectArea.trim().toUpperCase();
    if (trimmedSubject && !availableSubjectAreas.includes(trimmedSubject)) {
      // Add to available list
      setAvailableSubjectAreas(prev => [...prev, trimmedSubject].sort());
      setCustomSubjectArea('');
      setShowCustomSubject(false);
      // Show success message or auto-scroll to the new item
    } else if (trimmedSubject && availableSubjectAreas.includes(trimmedSubject)) {
      // If already exists, just close the input
      setCustomSubjectArea('');
      setShowCustomSubject(false);
    }
  };

  const removeSubjectArea = (subject: string) => {
    setSelectedSubjectAreas(prev => prev.filter(s => s !== subject));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoPreview(base64String);
        setFormData((prev) => ({
          ...prev,
          photo: base64String,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getPlaceholderAvatar = () => {
    if (formData.gender === 'male') {
      return 'https://ui-avatars.com/api/?name=Male&background=4F46E5&color=fff&size=128';
    } else if (formData.gender === 'female') {
      return 'https://ui-avatars.com/api/?name=Female&background=EC4899&color=fff&size=128';
    }
    return 'https://ui-avatars.com/api/?name=Teacher&background=6B7280&color=fff&size=128';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={teacher ? 'Edit Teacher' : 'Add Teacher'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            School <span className="text-red-500">*</span>
          </label>
          <select
            name="school_id"
            value={formData.school_id}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a school</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
          <Input
            label="Last Name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            required
          />
        </div>

        <Input
          label="Short Name"
          name="short_name"
          value={formData.short_name}
          onChange={handleChange}
          placeholder="e.g., J.Smith"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="ID Number (Kimlik No)"
            name="id_number"
            value={formData.id_number}
            onChange={handleChange}
            placeholder="e.g., 12345678901"
          />
          <div className="flex items-center pt-8">
            <input
              type="checkbox"
              name="is_available_for_duty"
              id="is_available_for_duty"
              checked={formData.is_available_for_duty}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_available_for_duty" className="ml-2 block text-sm text-gray-900">
              Available for Duty (Nöbetçi Olabilir)
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <img
              src={photoPreview || formData.photo || getPlaceholderAvatar()}
              alt="Teacher preview"
              className="w-32 h-32 rounded-full object-cover mx-auto mb-2 border-4"
              style={{ borderColor: formData.color_code }}
            />
            <p className="text-xs text-gray-500">
              {photoPreview || formData.photo ? 'Uploaded Photo' : 'Placeholder Avatar'}
            </p>
          </div>
        </div>

        {/* Teaching Languages Section */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teaching Languages (Can Teach In)
          </label>
          <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto bg-gray-50">
            <div className="grid grid-cols-3 gap-2">
              {['kazakh', 'russian', 'turkish', 'english', 'kyrgyz', 'german', 'french', 'uzbek', 'uyghur', 'chinese', 'japanese', 'korean', 'other'].map((lang) => (
                <label key={lang} className="flex items-center space-x-2 hover:bg-gray-100 p-2 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedLanguages.includes(lang)}
                    onChange={() => toggleLanguage(lang)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {lang === 'kazakh' ? 'Kazakça' :
                     lang === 'russian' ? 'Rusça' :
                     lang === 'turkish' ? 'Türkçe' :
                     lang === 'english' ? 'İngilizce' :
                     lang === 'kyrgyz' ? 'Kırgızca' :
                     lang === 'german' ? 'Almanca' :
                     lang === 'french' ? 'Fransızca' :
                     lang === 'uzbek' ? 'Özbekçe' :
                     lang === 'uyghur' ? 'Uygurca' :
                     lang === 'chinese' ? 'Çince' :
                     lang === 'japanese' ? 'Japonca' :
                     lang === 'korean' ? 'Korece' :
                     'Diğer'}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Selected: {selectedLanguages.length} language(s)
          </p>
        </div>

        {/* Subject Areas Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Branş / Subject Areas
            </label>
            <button
              type="button"
              onClick={() => setShowCustomSubject(!showCustomSubject)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + Özel Branş Ekle
            </button>
          </div>

          {/* Custom Subject Input */}
          {showCustomSubject && (
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={customSubjectArea}
                onChange={(e) => setCustomSubjectArea(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSubjectArea())}
                placeholder="Yeni branş adı girin..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addCustomSubjectArea}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Ekle
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustomSubject(false);
                  setCustomSubjectArea('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
              >
                İptal
              </button>
            </div>
          )}

          {/* Selected Subject Areas (Tags) */}
          {selectedSubjectAreas.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              {selectedSubjectAreas.map((subject) => (
                <span
                  key={subject}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full"
                >
                  {subject}
                  <button
                    type="button"
                    onClick={() => removeSubjectArea(subject)}
                    className="ml-1 hover:bg-blue-700 rounded-full p-0.5"
                    title="Kaldır"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Subject Areas Dropdown List */}
          <div className="border border-gray-300 rounded-md max-h-64 overflow-y-auto bg-gray-50">
            <div className="p-2">
              {availableSubjectAreas.map((subject) => (
                <label
                  key={subject}
                  className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                    selectedSubjectAreas.includes(subject)
                      ? 'bg-blue-100 hover:bg-blue-200'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSubjectAreas.includes(subject)}
                    onChange={() => toggleSubjectArea(subject)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className={`text-sm ${selectedSubjectAreas.includes(subject) ? 'font-medium text-blue-900' : 'text-gray-700'}`}>
                    {subject}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Seçilen: {selectedSubjectAreas.length} branş
          </p>
        </div>

        {/* Health Information Section */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Health Information (Optional)</h3>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_pregnant"
                id="is_pregnant"
                checked={formData.is_pregnant}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_pregnant" className="ml-2 block text-sm text-gray-900">
                Pregnant (Hamile)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="has_diabetes"
                id="has_diabetes"
                checked={formData.has_diabetes}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="has_diabetes" className="ml-2 block text-sm text-gray-900">
                Diabetes (Diyabet)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="has_gluten_intolerance"
                id="has_gluten_intolerance"
                checked={formData.has_gluten_intolerance}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="has_gluten_intolerance" className="ml-2 block text-sm text-gray-900">
                Gluten Intolerance
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other Chronic Conditions
            </label>
            <textarea
              name="other_health_conditions"
              value={formData.other_health_conditions}
              onChange={(e) => setFormData(prev => ({ ...prev, other_health_conditions: e.target.value }))}
              placeholder="Describe any other chronic health conditions..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Max Hours/Day"
            name="max_hours_per_day"
            type="number"
            min="1"
            max="12"
            value={formData.max_hours_per_day}
            onChange={handleChange}
          />
          <Input
            label="Max Hours/Week"
            name="max_hours_per_week"
            type="number"
            min="1"
            max="60"
            value={formData.max_hours_per_week}
            onChange={handleChange}
          />
          <Input
            label="Min Hours/Week"
            name="min_hours_per_week"
            type="number"
            min="0"
            max="60"
            value={formData.min_hours_per_week}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Max Consecutive Hours"
            name="max_consecutive_hours"
            type="number"
            min="1"
            max="8"
            value={formData.max_consecutive_hours}
            onChange={handleChange}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <div className="space-y-2">
              <div className="flex gap-1.5 flex-wrap">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color_code: color }))}
                    className={`w-7 h-7 rounded-md border-2 transition-all ${
                      formData.color_code === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <Input
                name="color_code"
                type="color"
                value={formData.color_code}
                onChange={handleChange}
                placeholder="Custom color"
              />
            </div>
          </div>
        </div>

        {/* Default Room */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sabit Oda (Opsiyonel)
          </label>
          <select
            name="default_room_id"
            value={formData.default_room_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Oda Seçilmedi</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} {room.short_name ? `(${room.short_name})` : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Öğretmenler sabit strateji seçildiğinde bu oda kullanılacak
          </p>
        </div>

        {/* Availability Grid */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Müsaitlik Programı</h3>
          <AvailabilityGrid
            value={formData.unavailable_slots}
            onChange={(value) => setFormData(prev => ({ ...prev, unavailable_slots: value }))}
            maxPeriods={formData.max_hours_per_day}
            workingDays={[1, 2, 3, 4, 5]}
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="is_active"
            id="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
            Active
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : teacher ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

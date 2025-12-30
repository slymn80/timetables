import { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { timetableService, schoolService } from '../../lib/services';
import type { Timetable, School } from '../../types';

interface TimetableFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  timetable?: Timetable | null;
}

export default function TimetableForm({ isOpen, onClose, onSuccess, timetable }: TimetableFormProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [formData, setFormData] = useState({
    school_id: '',
    name: '',
    algorithm: 'cpsat',
    academic_year: '',
    semester: '',
    // Algorithm parameters
    algorithm_parameters: {
      // Working schedule
      working_days: [1, 2, 3, 4, 5], // Monday-Friday
      periods_per_day: 8,
      preferred_free_day: 'none',

      // Performance settings
      max_iterations: 10000,
      timeout_minutes: 5,
      optimization_level: 'balanced',

      // Distribution rules
      minimize_gaps: true,
      prefer_morning_for_hard_subjects: true,
      max_consecutive_same_subject: 2,

      // Room assignment strategy
      room_assignment_strategy: 'classes_fixed', // 'classes_fixed' | 'teachers_fixed' | 'hybrid' | 'none'

      // Teacher constraints
      max_teacher_daily_hours: 8,
      max_teacher_weekly_hours: 40,

      // Class constraints
      max_class_daily_hours: 8,
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    const defaultParams = {
      working_days: [1, 2, 3, 4, 5],
      periods_per_day: 8,
      preferred_free_day: 'none',
      max_iterations: 10000,
      timeout_minutes: 5,
      optimization_level: 'balanced',
      minimize_gaps: true,
      prefer_morning_for_hard_subjects: true,
      max_consecutive_same_subject: 2,
      room_assignment_strategy: 'classes_fixed',
      max_teacher_daily_hours: 8,
      max_teacher_weekly_hours: 40,
      max_class_daily_hours: 8,
    };

    if (timetable) {
      setFormData({
        school_id: timetable.school_id || schools[0]?.id || '',
        name: timetable.name || '',
        algorithm: timetable.algorithm || 'cpsat',
        academic_year: timetable.academic_year || '',
        semester: timetable.semester || '',
        algorithm_parameters: timetable.algorithm_parameters || defaultParams,
      });
    } else {
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      setFormData({
        school_id: schools[0]?.id || '',
        name: '',
        algorithm: 'cpsat',
        academic_year: `${currentYear}-${nextYear}`,
        semester: 'Fall',
        algorithm_parameters: defaultParams,
      });
    }
    setError('');
  }, [timetable, isOpen, schools]);

  const loadSchools = async () => {
    try {
      const response = await schoolService.getAll();
      setSchools(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Failed to load schools:', err);
      setSchools([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (timetable) {
        await timetableService.update(timetable.id, formData);
      } else {
        await timetableService.create(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleParamChange = (paramName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      algorithm_parameters: {
        ...prev.algorithm_parameters,
        [paramName]: value,
      },
    }));
  };

  const handleWorkingDayToggle = (day: number) => {
    setFormData((prev) => {
      const currentDays = prev.algorithm_parameters.working_days;
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day].sort();
      return {
        ...prev,
        algorithm_parameters: {
          ...prev.algorithm_parameters,
          working_days: newDays,
        },
      };
    });
  };

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={timetable ? 'Edit Timetable' : 'Create Timetable'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Temel Bilgiler</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              School <span className="text-red-500">*</span>
            </label>
            <select
              name="school_id"
              value={formData.school_id}
              onChange={handleChange}
              required
              disabled={!!timetable}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select a school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Timetable Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., 2024-2025 Fall Semester"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Academic Year"
              name="academic_year"
              value={formData.academic_year}
              onChange={handleChange}
              placeholder="e.g., 2024-2025"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Semester
              </label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select semester</option>
                <option value="Fall">Fall</option>
                <option value="Spring">Spring</option>
                <option value="Summer">Summer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Working Schedule */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Çalışma Programı</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Çalışma Günleri
            </label>
            <div className="flex gap-2">
              {dayNames.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleWorkingDayToggle(index + 1)}
                  className={`px-3 py-2 rounded-md border-2 transition-all ${
                    formData.algorithm_parameters.working_days.includes(index + 1)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Günlük Ders Sayısı
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={formData.algorithm_parameters.periods_per_day}
                onChange={(e) => handleParamChange('periods_per_day', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Boş Gün Tercihi
              </label>
              <select
                value={formData.algorithm_parameters.preferred_free_day}
                onChange={(e) => handleParamChange('preferred_free_day', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">Yok</option>
                <option value="monday">Pazartesi</option>
                <option value="tuesday">Salı</option>
                <option value="wednesday">Çarşamba</option>
                <option value="thursday">Perşembe</option>
                <option value="friday">Cuma</option>
                <option value="saturday">Cumartesi</option>
                <option value="sunday">Pazar</option>
              </select>
            </div>
          </div>
        </div>

        {/* Algorithm & Performance */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Algoritma ve Performans</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Algoritma
            </label>
            <select
              name="algorithm"
              value={formData.algorithm}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="cpsat">CP-SAT</option>
              <option value="greedy">Greedy Algorithm (Hızlı)</option>
              <option value="backtracking">Backtracking (Orta)</option>
              <option value="genetic">Genetic Algorithm (Detaylı)</option>
              <option value="simulated_annealing">Simulated Annealing (Detaylı)</option>
              <option value="hybrid">Hybrid - AI Enhanced (En İyi)</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maksimum İterasyon
              </label>
              <input
                type="number"
                min="100"
                max="100000"
                step="100"
                value={formData.algorithm_parameters.max_iterations}
                onChange={(e) => handleParamChange('max_iterations', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeout (dakika)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={formData.algorithm_parameters.timeout_minutes}
                onChange={(e) => handleParamChange('timeout_minutes', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Optimizasyon Seviyesi
              </label>
              <select
                value={formData.algorithm_parameters.optimization_level}
                onChange={(e) => handleParamChange('optimization_level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fast">Hızlı</option>
                <option value="balanced">Dengeli</option>
                <option value="thorough">Detaylı</option>
              </select>
            </div>
          </div>
        </div>

        {/* Distribution Rules */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Ders Dağıtım Kuralları</h3>

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.algorithm_parameters.minimize_gaps}
                onChange={(e) => handleParamChange('minimize_gaps', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="ml-2 text-sm text-gray-700">
                Boş saatleri minimize et
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.algorithm_parameters.prefer_morning_for_hard_subjects}
                onChange={(e) => handleParamChange('prefer_morning_for_hard_subjects', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="ml-2 text-sm text-gray-700">
                Zor dersleri sabah saatlerine yerleştir
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Oda Atama Stratejisi
            </label>
            <select
              value={formData.algorithm_parameters.room_assignment_strategy}
              onChange={(e) => handleParamChange('room_assignment_strategy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="classes_fixed">Sınıflar Sabit - Öğretmenler Gezecek</option>
              <option value="teachers_fixed">Öğretmenler Sabit - Öğrenciler Gezecek</option>
              <option value="hybrid">Hibrit - Lab/Spor için Öğretmen Odası, Normal Dersler için Sınıf Odası</option>
              <option value="none">Oda Ataması Yapma</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {formData.algorithm_parameters.room_assignment_strategy === 'classes_fixed' &&
                'Her sınıf kendi odasında kalır, öğretmenler sınıflara gider'}
              {formData.algorithm_parameters.room_assignment_strategy === 'teachers_fixed' &&
                'Her öğretmen kendi odasında kalır, öğrenciler öğretmenlere gider'}
              {formData.algorithm_parameters.room_assignment_strategy === 'hybrid' &&
                'Lab/spor gibi özel dersler öğretmen odasında, diğerleri sınıf odasında'}
              {formData.algorithm_parameters.room_assignment_strategy === 'none' &&
                'Hiçbir oda ataması yapılmaz'}
            </p>
          </div>

        </div>

        {/* Constraints */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Kısıtlamalar</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Öğretmen Günlük Maks. Saat
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={formData.algorithm_parameters.max_teacher_daily_hours}
                onChange={(e) => handleParamChange('max_teacher_daily_hours', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Öğretmen Haftalık Maks. Saat
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={formData.algorithm_parameters.max_teacher_weekly_hours}
                onChange={(e) => handleParamChange('max_teacher_weekly_hours', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sınıf Günlük Maks. Saat
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={formData.algorithm_parameters.max_class_daily_hours}
                onChange={(e) => handleParamChange('max_class_daily_hours', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
          <Button type="button" variant="secondary" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Oluşturuluyor...' : timetable ? 'Güncelle' : 'Oluştur'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

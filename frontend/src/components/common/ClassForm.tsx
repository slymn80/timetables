import { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import AvailabilityGrid from './AvailabilityGrid';
import { classService, schoolService, subjectService, teacherService, lessonService, roomService } from '../../lib/services';
import type { Class, School, Subject, Teacher, Room } from '../../types';

interface ClassFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classData?: Class | null;
}

const COLOR_PALETTE = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
  '#DC2626', '#EA580C', '#059669', '#2563EB', '#7C3AED',
  '#DB2777', '#0D9488', '#C2410C', '#4F46E5', '#65A30D',
  '#BE123C', '#B45309', '#047857', '#1D4ED8', '#6D28D9'
];

export default function ClassForm({ isOpen, onClose, onSuccess, classData }: ClassFormProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    school_id: '',
    name: '',
    short_name: '',
    grade_level: 9,
    language: '',
    student_count: 30,
    max_hours_per_day: 8,
    homeroom_teacher_id: '',
    default_room_id: '',
    color_code: COLOR_PALETTE[0],
    unavailable_slots: {} as Record<string, number[]>,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    if (classData) {
      setFormData({
        school_id: classData.school_id || schools[0]?.id || '',
        name: classData.name || '',
        short_name: classData.short_name || '',
        grade_level: classData.grade_level || 9,
        language: classData.language || '',
        student_count: classData.student_count || 30,
        max_hours_per_day: classData.max_hours_per_day || 8,
        homeroom_teacher_id: classData.homeroom_teacher_id || '',
        default_room_id: classData.default_room_id || '',
        color_code: classData.color_code || COLOR_PALETTE[0],
        unavailable_slots: classData.unavailable_slots || {},
      });
    } else {
      setFormData({
        school_id: schools[0]?.id || '',
        name: '',
        short_name: '',
        grade_level: 9,
        language: '',
        student_count: 30,
        max_hours_per_day: 8,
        homeroom_teacher_id: '',
        default_room_id: '',
        color_code: COLOR_PALETTE[0],
        unavailable_slots: {},
      });
      setSelectedSubjects([]);
    }
    setError('');
  }, [classData, isOpen, schools]);

  useEffect(() => {
    if (formData.school_id) {
      loadSubjects(formData.school_id);
      loadTeachers(formData.school_id);
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

  const loadSubjects = async (schoolId: string) => {
    try {
      const response = await subjectService.getAll(schoolId);
      setSubjects(response.subjects || []);
    } catch (err) {
      console.error('Failed to load subjects:', err);
      setSubjects([]);
    }
  };

  const loadTeachers = async (schoolId: string) => {
    try {
      const response = await teacherService.getAll(schoolId);
      setTeachers(response.teachers || []);
    } catch (err) {
      console.error('Failed to load teachers:', err);
      setTeachers([]);
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

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Prepare submit data - remove empty homeroom_teacher_id and default_room_id
      const submitData: any = {
        ...formData,
      };

      // Remove empty homeroom_teacher_id to avoid validation errors
      if (!submitData.homeroom_teacher_id) {
        delete submitData.homeroom_teacher_id;
      }

      // Remove empty default_room_id to avoid validation errors
      if (!submitData.default_room_id) {
        delete submitData.default_room_id;
      }

      console.log('DEBUG: Submitting class data:', JSON.stringify(submitData, null, 2));
      console.log('DEBUG: unavailable_slots:', JSON.stringify(submitData.unavailable_slots, null, 2));

      let createdClassId: string;

      if (classData) {
        await classService.update(classData.id, submitData);
        createdClassId = classData.id;
      } else {
        const result = await classService.create(submitData);
        createdClassId = result.id;
      }

      // Create lessons for selected subjects (only for new classes)
      if (!classData && selectedSubjects.length > 0) {
        console.log('Creating lessons for', selectedSubjects.length, 'subjects');
        console.log('Class ID:', createdClassId);
        
        for (const subjectId of selectedSubjects) {
          const subject = subjects.find(s => s.id === subjectId);
          try {
            const lessonData = {
              class_id: createdClassId,
              subject_id: subjectId,
              hours_per_week: subject?.default_weekly_hours || 2,
              num_groups: subject?.default_num_groups || 1, // Use subject's default_num_groups
              requires_double_period: false,
              allow_consecutive: true,
            };
            console.log('Creating lesson:', lessonData);

            const lessonResult = await lessonService.create(lessonData);
            console.log('Lesson created successfully:', lessonResult);
          } catch (err: any) {
            console.error('Failed to create lesson for subject:', subjectId, err);
            console.error('Error details:', err.response?.data);
            // Don't fail the whole process, just log and continue
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      // Handle validation errors properly
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Pydantic validation errors
        const errorMessages = detail.map((e: any) => e.msg || e.message).join(', ');
        setError(errorMessages);
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('An error occurred while saving the class');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={classData ? 'Edit Class' : 'Add Class'}
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
            disabled={!!classData}
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

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Class Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., 9A"
            required
          />
          <Input
            label="Short Name"
            name="short_name"
            value={formData.short_name}
            onChange={handleChange}
            placeholder="e.g., 9A"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Grade Level"
            name="grade_level"
            type="number"
            min="1"
            max="12"
            value={formData.grade_level}
            onChange={handleChange}
            required
          />
          <Input
            label="Student Count"
            name="student_count"
            type="number"
            min="1"
            max="100"
            value={formData.student_count}
            onChange={handleChange}
          />
          <Input
            label="Max Hours/Day"
            name="max_hours_per_day"
            type="number"
            min="1"
            max="12"
            value={formData.max_hours_per_day}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seçiniz</option>
              <option value="kazakh">Kazakça</option>
              <option value="russian">Rusça</option>
              <option value="turkish">Türkçe</option>
              <option value="english">İngilizce</option>
              <option value="kyrgyz">Kırgızca</option>
              <option value="german">Almanca</option>
              <option value="french">Fransızca</option>
              <option value="uzbek">Özbekçe</option>
              <option value="uyghur">Uygurca</option>
              <option value="chinese">Çince</option>
              <option value="japanese">Japonca</option>
              <option value="korean">Korece</option>
              <option value="other">Diğer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Homeroom Teacher (Optional)
            </label>
            <select
              name="homeroom_teacher_id"
              value={formData.homeroom_teacher_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No homeroom teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name || `${teacher.first_name} ${teacher.last_name}`.trim() || 'Unnamed Teacher'}
                </option>
              ))}
            </select>
          </div>

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
              Sınıflar sabit strateji seçildiğinde bu oda kullanılacak
            </p>
          </div>
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Class Color
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

        {/* Course Selection from Course Pool */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Courses from Course Pool
          </label>
          <div className="border border-gray-300 rounded-md p-3 max-h-60 overflow-y-auto bg-gray-50">
            {subjects.length === 0 ? (
              <p className="text-sm text-gray-500">No courses available. Please add courses to the Course Pool first.</p>
            ) : (
              <div className="space-y-2">
                {subjects
                  .filter(subject => {
                    // Show subjects that match the grade level or have no grade level specified
                    if (!subject.grade_level) return true;
                    return subject.grade_level === String(formData.grade_level);
                  })
                  .map((subject) => (
                  <label key={subject.id} className="flex items-center space-x-2 hover:bg-gray-100 p-2 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSubjects.includes(subject.id)}
                      onChange={() => toggleSubject(subject.id)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="text-sm text-gray-700">
                      <span className="font-medium">{subject.name}</span>
                      <span className="text-gray-500 ml-2">({subject.short_code})</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Selected: {selectedSubjects.length} course(s) • Grade Level: {formData.grade_level}
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : classData ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

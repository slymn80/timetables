import { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { lessonService, schoolService, classService, subjectService, teacherService } from '../../lib/services';
import type { Lesson, School, Class, Subject, Teacher } from '../../types';

interface LessonFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lesson?: Lesson | null;
}

export default function LessonForm({ isOpen, onClose, onSuccess, lesson }: LessonFormProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [formData, setFormData] = useState({
    school_id: '',
    class_id: '',
    subject_id: '',
    teacher_id: '',
    hours_per_week: 2,
    can_split: false,
    num_groups: 1,
    max_hours_per_day: undefined as number | undefined,
    distribution_pattern: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    if (lesson) {
      setFormData({
        school_id: lesson.school_id || schools[0]?.id || '',
        class_id: lesson.class_id || '',
        subject_id: lesson.subject_id || '',
        teacher_id: lesson.teacher_id || '',
        hours_per_week: lesson.hours_per_week || 2,
        can_split: lesson.can_split || false,
        num_groups: lesson.num_groups || 1,
        max_hours_per_day: lesson.max_hours_per_day,
        distribution_pattern: lesson.extra_metadata?.user_distribution_pattern || '',
      });
    } else {
      setFormData({
        school_id: schools[0]?.id || '',
        class_id: '',
        subject_id: '',
        teacher_id: '',
        hours_per_week: 2,
        can_split: false,
        num_groups: 1,
        max_hours_per_day: undefined,
        distribution_pattern: '',
      });
    }
    setError('');
  }, [lesson, isOpen, schools]);

  useEffect(() => {
    if (formData.school_id) {
      loadClasses(formData.school_id);
      loadSubjects(formData.school_id);
      loadTeachers(formData.school_id);
    }
  }, [formData.school_id]);

  const loadSchools = async () => {
    try {
      const response = await schoolService.getAll();
      setSchools(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Failed to load schools:', err);
      setSchools([]);
    }
  };

  const loadClasses = async (schoolId: string) => {
    try {
      const response = await classService.getAll(schoolId);
      setClasses(response.classes || []);
    } catch (err) {
      console.error('Failed to load classes:', err);
      setClasses([]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Prepare extra_metadata with distribution pattern
    const extraMetadata: Record<string, any> = {};
    if (formData.distribution_pattern && formData.distribution_pattern.trim()) {
      extraMetadata.user_distribution_pattern = formData.distribution_pattern.trim();
    }

    // Prepare data for submission (exclude school_id as it's not in Lesson model directly)
    const submitData: any = {
      class_id: formData.class_id,
      subject_id: formData.subject_id,
      teacher_id: formData.teacher_id || undefined,
      hours_per_week: formData.hours_per_week,
      can_split: formData.can_split,
      num_groups: formData.num_groups,
      max_hours_per_day: formData.max_hours_per_day || undefined,
    };

    // Only add extra_metadata if there's something in it
    if (Object.keys(extraMetadata).length > 0) {
      submitData.extra_metadata = extraMetadata;
    }

    try {
      if (lesson) {
        await lessonService.update(lesson.id, submitData);
      } else {
        await lessonService.create(submitData);
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
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lesson ? 'Edit Lesson' : 'Add Lesson'}
      size="md"
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
            disabled={!!lesson}
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Class <span className="text-red-500">*</span>
          </label>
          <select
            name="class_id"
            value={formData.class_id}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <select
            name="subject_id"
            value={formData.subject_id}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teacher
          </label>
          <select
            name="teacher_id"
            value={formData.teacher_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a teacher (optional)</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.full_name || teacher.short_name || 'Unknown Teacher'}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Teacher can be assigned later if not selected now
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Hours per Week"
            name="hours_per_week"
            type="number"
            min="1"
            max="20"
            value={formData.hours_per_week}
            onChange={handleChange}
            required
          />
          <Input
            label="Number of Groups"
            name="num_groups"
            type="number"
            min="1"
            max="10"
            value={formData.num_groups}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="can_split"
              checked={formData.can_split}
              onChange={handleChange}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">
              Can split into multiple periods
            </span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dağıtım Paterni (Distribution Pattern)
          </label>
          <input
            type="text"
            name="distribution_pattern"
            value={formData.distribution_pattern}
            onChange={handleChange}
            placeholder="Örn: 1+3, 2+2, 3+1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Haftalık ders dağılımını belirtin (örn: "1+3" = ilk gün 1 saat, ikinci gün 3 saat). Boş bırakırsanız otomatik dağıtım yapılır.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Aynı Güne Max Kaç Saat Atanabilir?
          </label>
          <input
            type="number"
            name="max_hours_per_day"
            value={formData.max_hours_per_day || ''}
            onChange={handleChange}
            placeholder="Boş = kısıt yok"
            min="1"
            max={formData.hours_per_week}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Dersin aynı gün içinde en fazla kaç saat atanabileceğini belirtin. Örnek: 4 saatlik ders 1+1+1+1 şeklinde bölündüyse ve buraya "1" girerseniz, her saat farklı bir güne atanır. 2+2 gibi durumlarda anlamlı değildir. Boş bırakırsanız kısıt uygulanmaz.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : lesson ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

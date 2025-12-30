import { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { subjectService, schoolService } from '../../lib/services';
import type { Subject, School } from '../../types';

interface SubjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subject?: Subject | null;
}

const COLOR_PALETTE = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
  '#DC2626', '#EA580C', '#059669', '#2563EB', '#7C3AED',
  '#DB2777', '#0D9488', '#C2410C', '#4F46E5', '#65A30D',
  '#BE123C', '#B45309', '#047857', '#1D4ED8', '#6D28D9'
];

export default function SubjectForm({ isOpen, onClose, onSuccess, subject }: SubjectFormProps) {
  const [schools, setSchools] = useState<School[]>([]);

  const [formData, setFormData] = useState({
    school_id: '',
    name: '',
    short_code: '',
    description: '',
    grade_level: '',
    default_weekly_hours: 0,
    default_distribution_format: '',
    is_mandatory: true,
    delivery_mode: 'in_person',
    can_split_groups: false,
    default_num_groups: 1,
    color_code: '#10B981',
    requires_room_type: '',
    preferred_time_of_day: '',
    difficulty_level: 0,
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    if (subject) {
      setFormData({
        school_id: subject.school_id || schools[0]?.id || '',
        name: subject.name || '',
        short_code: subject.short_code || '',
        description: subject.description || '',
        grade_level: subject.grade_level || '',
        default_weekly_hours: subject.default_weekly_hours || 0,
        default_distribution_format: subject.default_distribution_format || '',
        is_mandatory: subject.is_mandatory !== undefined ? subject.is_mandatory : true,
        delivery_mode: subject.delivery_mode || 'in_person',
        can_split_groups: subject.can_split_groups || false,
        default_num_groups: subject.default_num_groups || 1,
        color_code: subject.color_code || '#10B981',
        requires_room_type: subject.requires_room_type || '',
        preferred_time_of_day: subject.preferred_time_of_day || '',
        difficulty_level: subject.difficulty_level !== undefined ? subject.difficulty_level : 0,
        is_active: subject.is_active !== undefined ? subject.is_active : true,
      });
    } else {
      setFormData({
        school_id: schools[0]?.id || '',
        name: '',
        short_code: '',
        description: '',
        grade_level: '',
        default_weekly_hours: 0,
        default_distribution_format: '',
        is_mandatory: true,
        delivery_mode: 'in_person',
        can_split_groups: false,
        default_num_groups: 1,
        color_code: '#10B981',
        requires_room_type: '',
        preferred_time_of_day: '',
        difficulty_level: 0,
        is_active: true,
      });
    }
    setError('');
  }, [subject, isOpen, schools]);

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
      if (subject) {
        await subjectService.update(subject.id, formData);
      } else {
        await subjectService.create(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      // Handle validation errors
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          setError(detail.map((d: any) => d.msg).join(', '));
        } else if (typeof detail === 'string') {
          setError(detail);
        } else {
          setError('Validation error occurred');
        }
      } else {
        setError('An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      title={subject ? 'Edit Subject' : 'Add Subject'}
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
            label="Subject Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g., Mathematics"
          />
          <Input
            label="Short Code"
            name="short_code"
            value={formData.short_code}
            onChange={handleChange}
            required
            placeholder="e.g., MATH"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Brief description of the subject"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grade Level
            </label>
            <select
              name="grade_level"
              value={formData.grade_level}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Grades</option>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
              <option value="9-10">Grades 9-10</option>
              <option value="9-10-11">Grades 9-10-11</option>
              <option value="10-11">Grades 10-11</option>
              <option value="10-11-12">Grades 10-11-12</option>
              <option value="11-12">Grades 11-12</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Mode
            </label>
            <select
              name="delivery_mode"
              value={formData.delivery_mode}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="in_person">In-Person (Offline)</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Default Weekly Hours"
            name="default_weekly_hours"
            type="number"
            min="0"
            max="20"
            value={formData.default_weekly_hours}
            onChange={handleChange}
            placeholder="e.g., 5"
          />
          <Input
            label="Distribution Format"
            name="default_distribution_format"
            value={formData.default_distribution_format}
            onChange={handleChange}
            placeholder="e.g., 2+2+1, 3+2"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Type
            </label>
            <select
              name="is_mandatory"
              value={formData.is_mandatory ? 'true' : 'false'}
              onChange={(e) => setFormData(prev => ({ ...prev, is_mandatory: e.target.value === 'true' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="true">Mandatory</option>
              <option value="false">Elective</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Requires Room Type
            </label>
            <select
              name="requires_room_type"
              value={formData.requires_room_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Any Room</option>
              <option value="classroom">Classroom</option>
              <option value="lab">Laboratory</option>
              <option value="computer_lab">Computer Lab</option>
              <option value="gym">Gymnasium</option>
              <option value="art_room">Art Room</option>
              <option value="music_room">Music Room</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Time of Day
            </label>
            <select
              name="preferred_time_of_day"
              value={formData.preferred_time_of_day}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No Preference</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty Level
            </label>
            <select
              name="difficulty_level"
              value={formData.difficulty_level}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="0">No Level</option>
              <option value="1">1 - Very Easy</option>
              <option value="2">2 - Easy</option>
              <option value="3">3 - Below Average</option>
              <option value="4">4 - Average</option>
              <option value="5">5 - Moderate</option>
              <option value="6">6 - Above Average</option>
              <option value="7">7 - Challenging</option>
              <option value="8">8 - Difficult</option>
              <option value="9">9 - Very Difficult</option>
              <option value="10">10 - Extremely Difficult</option>
            </select>
          </div>

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

        <div className="space-y-4">
          <div className="flex items-center space-x-6">
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
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                name="can_split_groups"
                id="can_split_groups"
                checked={formData.can_split_groups}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="can_split_groups" className="ml-2 block text-sm font-medium text-gray-900">
                Can Split Into Groups
              </label>
            </div>

            {formData.can_split_groups && (
              <div className="ml-6">
                <Input
                  label="Number of Groups"
                  name="default_num_groups"
                  type="number"
                  min="2"
                  max="10"
                  value={formData.default_num_groups}
                  onChange={handleChange}
                  placeholder="e.g., 2"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : subject ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

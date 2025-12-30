import { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { academicYearService, schoolService } from '../../lib/services';
import type { AcademicYear, School } from '../../types';

interface AcademicYearFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  academicYear?: AcademicYear | null;
}

export default function AcademicYearForm({ isOpen, onClose, onSuccess, academicYear }: AcademicYearFormProps) {
  const [schools, setSchools] = useState<School[]>([]);

  const [formData, setFormData] = useState({
    school_id: '',
    name: '',
    start_date: '',
    end_date: '',
    description: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    if (academicYear) {
      setFormData({
        school_id: academicYear.school_id || schools[0]?.id || '',
        name: academicYear.name || '',
        start_date: academicYear.start_date || '',
        end_date: academicYear.end_date || '',
        description: academicYear.description || '',
        is_active: academicYear.is_active !== undefined ? academicYear.is_active : true,
      });
    } else {
      setFormData({
        school_id: schools[0]?.id || '',
        name: '',
        start_date: '',
        end_date: '',
        description: '',
        is_active: true,
      });
    }
    setError('');
  }, [academicYear, isOpen, schools]);

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
      if (academicYear) {
        await academicYearService.update(academicYear.id, formData);
      } else {
        await academicYearService.create(formData);
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
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={academicYear ? 'Edit Academic Year' : 'Add Academic Year'}
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

        <Input
          label="Academic Year Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="e.g., 2024-2025"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            name="start_date"
            type="date"
            value={formData.start_date}
            onChange={handleChange}
            required
          />
          <Input
            label="End Date"
            name="end_date"
            type="date"
            value={formData.end_date}
            onChange={handleChange}
            required
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
            placeholder="Optional description"
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
            {loading ? 'Saving...' : academicYear ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

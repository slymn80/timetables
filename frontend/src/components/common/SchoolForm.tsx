import { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { schoolService } from '../../lib/services';
import type { School } from '../../types';

interface SchoolFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  school?: School | null;
}

export default function SchoolForm({ isOpen, onClose, onSuccess, school }: SchoolFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    principal_name: '',
    deputy_principal_name: '',
    school_type: '',
    education_type: 'normal',
    logo: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  useEffect(() => {
    if (school) {
      setFormData({
        name: school.name,
        short_name: school.short_name || '',
        principal_name: school.principal_name || '',
        deputy_principal_name: school.deputy_principal_name || '',
        school_type: school.school_type || '',
        education_type: school.education_type || 'normal',
        logo: school.logo || '',
        address: school.address || '',
        phone: school.phone || '',
        email: school.email || '',
        website: school.website || '',
        is_active: school.is_active,
      });
      setLogoPreview(school.logo || '');
    } else {
      setFormData({
        name: '',
        short_name: '',
        principal_name: '',
        deputy_principal_name: '',
        school_type: '',
        education_type: 'normal',
        logo: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        is_active: true,
      });
      setLogoPreview('');
    }
    setError('');
    setLogoFile(null);
  }, [school, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (school) {
        await schoolService.update(school.id, formData);
      } else {
        await schoolService.create(formData);
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
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // Create preview and update form data
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setFormData((prev) => ({
          ...prev,
          logo: base64String,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={school ? 'Edit School' : 'Add School'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <Input
          label="School Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Short Name"
            name="short_name"
            value={formData.short_name}
            onChange={handleChange}
          />

          <Input
            label="Principal Name"
            name="principal_name"
            value={formData.principal_name}
            onChange={handleChange}
            placeholder="Okul müdürü adı"
          />
        </div>

        <Input
          label="Deputy Principal Name"
          name="deputy_principal_name"
          value={formData.deputy_principal_name}
          onChange={handleChange}
          placeholder="Sorumlu müdür yardımcısı adı"
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              School Type
            </label>
            <select
              name="school_type"
              value={formData.school_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seçiniz</option>
              <option value="okul">Okul</option>
              <option value="ilkokul">İlkokul</option>
              <option value="ortaokul">Ortaokul</option>
              <option value="lise">Lise</option>
              <option value="kolej">Kolej</option>
              <option value="universite">Üniversite</option>
              <option value="kurs_merkezi">Kurs Merkezi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Education Type
            </label>
            <select
              name="education_type"
              value={formData.education_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="normal">Normal Eğitim</option>
              <option value="ikili">İkili Eğitim</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            School Logo
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {logoPreview && (
            <div className="mt-2">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-20 w-20 object-contain border border-gray-300 rounded"
              />
            </div>
          )}
        </div>

        <Input
          label="Address"
          name="address"
          value={formData.address}
          onChange={handleChange}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
          />

          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <Input
          label="Website"
          name="website"
          type="url"
          value={formData.website}
          onChange={handleChange}
        />

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
            {loading ? 'Saving...' : school ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { useState, useEffect } from 'react';
import { academicYearService } from '../lib/services';
import type { AcademicYear } from '../types';
import Button from '../components/common/Button';
import AcademicYearForm from '../components/common/AcademicYearForm';
import SchoolFilterBanner from '../components/common/SchoolFilterBanner';
import { useAcademicYear } from '../context/AcademicYearContext';

export default function AcademicYears() {
  const { selectedSchoolId } = useAcademicYear();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<AcademicYear | null>(null);

  useEffect(() => {
    if (selectedSchoolId) {
      loadAcademicYears();
    } else {
      setLoading(false);
    }
  }, [selectedSchoolId]);

  const loadAcademicYears = async () => {
    try {
      setLoading(true);
      const response = await academicYearService.getAll(selectedSchoolId!);

      // Handle both object with academic_years property and direct array
      const yearsData = response && typeof response === 'object' && 'academic_years' in response
        ? (response as any).academic_years
        : response;

      setAcademicYears(Array.isArray(yearsData) ? yearsData : []);
    } catch (error) {
      console.error('Failed to load academic years:', error);
      setAcademicYears([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedAcademicYear(null);
    setIsFormOpen(true);
  };

  const handleEdit = (academicYear: AcademicYear) => {
    setSelectedAcademicYear(academicYear);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this academic year?')) {
      return;
    }

    try {
      await academicYearService.delete(id);
      loadAcademicYears();
    } catch (error) {
      console.error('Failed to delete academic year:', error);
      alert('Failed to delete academic year');
    }
  };

  const handleFormSuccess = () => {
    loadAcademicYears();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading academic years...</div>
      </div>
    );
  }

  return (
    <div>
      <SchoolFilterBanner />

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Academic Years</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage academic years for your school
            </p>
          </div>
          <Button onClick={handleAdd}>Add Academic Year</Button>
        </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {academicYears.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No academic years found. Click "Add Academic Year" to create one.
                </td>
              </tr>
            ) : (
              academicYears.map((year) => (
                <tr key={year.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{year.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(year.start_date)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(year.end_date)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {year.description || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        year.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {year.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(year)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(year.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AcademicYearForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
        academicYear={selectedAcademicYear}
      />
      </div>
    </div>
  );
}

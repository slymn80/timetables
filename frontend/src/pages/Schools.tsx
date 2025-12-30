import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import SchoolForm from '../components/common/SchoolForm';
import { useAcademicYear } from '../context/AcademicYearContext';
import { schoolService } from '../lib/services';
import type { School } from '../types';

export default function Schools() {
  const { selectedSchoolId, setSelectedSchoolId } = useAcademicYear();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const data = await schoolService.getAll();
      setSchools(data);
    } catch (error) {
      console.error('Failed to load schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedSchool(null);
    setIsFormOpen(true);
  };

  const handleEdit = (school: School) => {
    setSelectedSchool(school);
    setIsFormOpen(true);
  };

  const handleDelete = async (school: School) => {
    if (window.confirm(`Are you sure you want to delete ${school.name}?`)) {
      try {
        await schoolService.delete(school.id);
        loadSchools();
      } catch (error) {
        console.error('Failed to delete school:', error);
        alert('Failed to delete school');
      }
    }
  };

  const handleFormSuccess = () => {
    loadSchools();
  };

  const handleSetActive = (school: School) => {
    setSelectedSchoolId(school.id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Schools</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add School
        </Button>
      </div>

      <SchoolForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
        school={selectedSchool}
      />

      <Card>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : schools.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No schools found. Click "Add School" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Logo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Principal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deputy Principal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Education
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
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
                {schools.map((school) => (
                  <tr key={school.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {school.logo ? (
                        <img
                          src={school.logo}
                          alt={`${school.name} logo`}
                          className="h-10 w-10 object-contain"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                          No Logo
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{school.name}</div>
                      {school.short_name && (
                        <div className="text-sm text-gray-500">{school.short_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {school.principal_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {school.deputy_principal_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {school.school_type ? (
                        <span className="capitalize">{school.school_type.replace('_', ' ')}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {school.education_type === 'ikili' ? 'İkili Eğitim' : 'Normal Eğitim'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {school.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          school.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {school.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleSetActive(school)}
                        className={`mr-4 ${
                          selectedSchoolId === school.id
                            ? 'text-green-600 hover:text-green-900'
                            : 'text-gray-400 hover:text-green-600'
                        }`}
                        title={selectedSchoolId === school.id ? 'Currently Active' : 'Set as Active'}
                      >
                        <CheckCircle className={`h-5 w-5 ${selectedSchoolId === school.id ? 'fill-green-600' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleEdit(school)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(school)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

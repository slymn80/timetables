import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import SubjectForm from '../components/common/SubjectForm';
import SchoolFilterBanner from '../components/common/SchoolFilterBanner';
import { useAcademicYear } from '../context/AcademicYearContext';
import { subjectService } from '../lib/services';
import type { Subject } from '../types';

export default function Subjects() {
  const { selectedSchoolId } = useAcademicYear();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  useEffect(() => {
    if (selectedSchoolId) {
      loadSubjects();
    } else {
      setLoading(false);
    }
  }, [selectedSchoolId]);

  const loadSubjects = async () => {
    try {
      const response = await subjectService.getAll(selectedSchoolId!);
      setSubjects(response.subjects || []);
    } catch (error) {
      console.error('Failed to load subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedSubject(null);
    setIsFormOpen(true);
  };

  const handleEdit = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsFormOpen(true);
  };

  const handleDelete = async (subject: Subject) => {
    if (window.confirm(`Are you sure you want to delete ${subject.name}?`)) {
      try {
        await subjectService.delete(subject.id);
        loadSubjects();
      } catch (error) {
        console.error('Failed to delete subject:', error);
        alert('Failed to delete subject');
      }
    }
  };

  return (
    <div>
      <SchoolFilterBanner />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Course Pool</h1>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        </div>

      <SubjectForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={loadSubjects}
        subject={selectedSubject}
      />

      <Card>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No courses found. Click "Add Course" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weekly Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Format
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grouping
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
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
                {subjects.map((subject) => (
                  <tr key={subject.id} className={subject.can_split_groups ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {subject.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subject.short_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subject.default_weekly_hours || 0}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subject.default_distribution_format || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {subject.can_split_groups ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-200 text-amber-900">
                          Groups
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          subject.is_mandatory
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {subject.is_mandatory !== false ? 'Mandatory' : 'Elective'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          subject.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {subject.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(subject)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(subject)}
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
    </div>
  );
}

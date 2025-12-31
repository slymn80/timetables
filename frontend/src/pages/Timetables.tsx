import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Trash2, Play, FileText, Edit } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import TimetableForm from '../components/common/TimetableForm';
import SchoolFilterBanner from '../components/common/SchoolFilterBanner';
import { useAcademicYear } from '../context/AcademicYearContext';
import { timetableService } from '../lib/services';
import type { Timetable } from '../types';

export default function Timetables() {
  const navigate = useNavigate();
  const { selectedSchoolId } = useAcademicYear();
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);

  useEffect(() => {
    if (selectedSchoolId) {
      loadTimetables();
    } else {
      setLoading(false);
    }
  }, [selectedSchoolId]);

  const loadTimetables = async () => {
    try {
      const response = await timetableService.getAll(selectedSchoolId!);
      // Sort by created_at descending (newest first)
      const sorted = (response.timetables || []).sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setTimetables(sorted);
    } catch (error) {
      console.error('Failed to load timetables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (timetableId: string) => {
    navigate(`/timetables/${timetableId}`);
  };

  const handleEdit = (timetableId: string) => {
    navigate(`/timetables/${timetableId}/manual-edit`);
  };

  const handleCreateEmpty = async () => {
    try {
      if (!selectedSchoolId) {
        alert('Please select a school first.');
        return;
      }

      // Create a minimal timetable with default values
      const response = await timetableService.create({
        school_id: selectedSchoolId,
        name: `Manual Timetable - ${new Date().toLocaleString('tr-TR')}`,
        algorithm: 'manual',
      });

      // Navigate directly to the manual editor
      navigate(`/timetables/${response.id}/manual-edit`);
    } catch (error: any) {
      console.error('Failed to create empty timetable:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create empty timetable';
      alert(errorMessage);
    }
  };

  const handleGenerate = async (timetableId: string) => {
    if (!window.confirm('Are you sure you want to generate this timetable? This may take some time.')) {
      return;
    }

    setGenerating(timetableId);
    try {
      await timetableService.generate(timetableId);
      alert('Timetable generation started successfully!');
      await loadTimetables();
    } catch (error: any) {
      console.error('Failed to generate timetable:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to generate timetable';
      alert(errorMessage);
    } finally {
      setGenerating(null);
    }
  };

  const handleDelete = async (timetable: Timetable) => {
    if (!window.confirm(`Are you sure you want to delete "${timetable.name}"?`)) {
      return;
    }

    try {
      await timetableService.delete(timetable.id);
      await loadTimetables();
    } catch (error) {
      console.error('Failed to delete timetable:', error);
      alert('Failed to delete timetable');
    }
  };

  const handleDeleteAll = async () => {
    if (!selectedSchoolId) {
      alert('Please select a school first');
      return;
    }

    if (timetables.length === 0) {
      alert('No timetables to delete');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ALL ${timetables.length} timetable(s)?\n\nThis action cannot be undone!`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Double confirmation for safety
    const doubleConfirm = window.confirm('This will permanently delete all timetables. Are you absolutely sure?');
    if (!doubleConfirm) {
      return;
    }

    try {
      const result = await timetableService.deleteAll(selectedSchoolId);
      alert(result.message || `Successfully deleted ${result.deleted_count} timetable(s)`);
      await loadTimetables();
    } catch (error: any) {
      console.error('Failed to delete all timetables:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete all timetables';
      alert(errorMessage);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      generating: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      archived: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <SchoolFilterBanner />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Timetables</h1>
          <div className="flex gap-3">
          {timetables.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All ({timetables.length})
            </button>
          )}
          <Button
            onClick={handleCreateEmpty}
            variant="secondary"
          >
            <FileText className="mr-2 h-4 w-4" />
            Create Empty Timetable
          </Button>
          <Button onClick={() => { setSelectedTimetable(null); setIsFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Create Timetable
          </Button>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : timetables.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No timetables found. Click "Create Timetable" to generate one.
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
                    Academic Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Algorithm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Violations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timetables.map((timetable) => (
                  <tr
                    key={timetable.id}
                    className={`${
                      timetable.algorithm === 'manual'
                        ? 'bg-purple-50 hover:bg-purple-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {timetable.name}
                      {timetable.algorithm === 'manual' && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-purple-200 text-purple-800 rounded">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {timetable.academic_year || '-'}
                      {timetable.semester && ` (${timetable.semester})`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {timetable.created_at ? new Date(timetable.created_at).toLocaleString('tr-TR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="capitalize">
                        {timetable.algorithm.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          timetable.status
                        )}`}
                      >
                        {timetable.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {timetable.hard_constraint_violations || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {timetable.generation_duration_seconds
                        ? `${timetable.generation_duration_seconds}s`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleView(timetable.id)}
                        className="text-green-600 hover:text-green-900"
                        title="View Timetable"
                      >
                        <Eye className="h-4 w-4 inline" />
                      </button>
                      {timetable.algorithm === 'manual' ? (
                        <button
                          onClick={() => handleEdit(timetable.id)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Edit Manual Timetable"
                        >
                          <Edit className="h-4 w-4 inline" />
                        </button>
                      ) : (
                        timetable.status === 'draft' && (
                          <button
                            onClick={() => handleGenerate(timetable.id)}
                            disabled={generating === timetable.id}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            title="Generate"
                          >
                            <Play className="h-4 w-4 inline" />
                          </button>
                        )
                      )}
                      <button
                        onClick={() => handleDelete(timetable)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <TimetableForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={loadTimetables}
        timetable={selectedTimetable}
      />
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Edit3, AlertCircle, BarChart3, CheckCircle, XCircle, Clock } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import TimetableGrid from '../components/timetable/TimetableGrid';
import ViolationsModal from '../components/timetable/ViolationsModal';
import { timetableService, classService, teacherService } from '../lib/services';
import type { Timetable } from '../types';

type ViewType = 'class' | 'teacher';

interface TimeSlot {
  id: string;
  day_of_week: string;
  period_number: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
  label?: string;
}

interface TimetableEntry {
  id: string;
  time_slot_id: string;
  time_slot: {
    id: string;
    day: string;
    period_number: number;
    start_time: string;
    end_time: string;
    is_break: boolean;
  };
  lesson_id: string;
  lesson_group_id?: string;
  lesson_group_name?: string;
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  subject_short_code: string;
  subject_color?: string;
  teacher_id?: string;
  teacher_name?: string;
  teacher_short_name?: string;
  room_id?: string;
  room_name?: string;
  room_short_name?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TimetableView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [viewType, setViewType] = useState<ViewType>('class');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entities, setEntities] = useState<{ id: string; name: string; homeroom_teacher?: string; homeroom_classes?: string[] }[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showViolations, setShowViolations] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  useEffect(() => {
    loadTimetable();
    loadTimeSlots();

    // Check if edit mode should be enabled via query parameter
    const editParam = searchParams.get('edit');
    if (editParam === 'true') {
      setIsEditMode(true);
    }
  }, [id, searchParams]);

  useEffect(() => {
    if (timetable) {
      loadEntities();
    }
  }, [viewType, timetable]);

  useEffect(() => {
    if (selectedEntity) {
      loadEntries();
    }
  }, [selectedEntity]);

  const loadTimetable = async () => {
    if (!id) return;
    try {
      const response = await timetableService.getById(id);
      setTimetable(response);
    } catch (error) {
      console.error('Failed to load timetable:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeSlots = async () => {
    try {
      // Load time slots from API
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/v1/time-slots/?is_active=true`);
      const data = await response.json();

      // Filter out breaks and map to our format
      const slots: TimeSlot[] = (data.time_slots || [])
        .filter((slot: any) => !slot.is_break)
        .map((slot: any) => ({
          id: slot.id,
          day_of_week: slot.day.charAt(0).toUpperCase() + slot.day.slice(1).toLowerCase(),
          period_number: slot.period_number,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_break: slot.is_break,
          label: slot.label,
        }));

      setTimeSlots(slots);
    } catch (error) {
      console.error('Failed to load time slots:', error);
    }
  };

  const loadEntities = async () => {
    if (!timetable) return;
    try {
      if (viewType === 'class') {
        const response = await classService.getAll(timetable.school_id);
        const classList = response.classes || [];
        const entityList = classList.map((c: any) => ({
          id: c.id,
          name: c.name,
          homeroom_teacher: c.homeroom_teacher ? `${c.homeroom_teacher.first_name} ${c.homeroom_teacher.last_name}` : undefined,
        }));
        setEntities(entityList);
        if (entityList.length > 0) {
          setSelectedEntity(entityList[0].id);
        }
      } else {
        const response = await teacherService.getAll(timetable.school_id);
        const teacherList = response.teachers || [];
        const entityList = teacherList.map((t: any) => ({
          id: t.id,
          name: t.full_name || t.short_name || 'Unknown Teacher',
          homeroom_classes: t.homeroom_classes ? t.homeroom_classes.map((c: any) => c.name) : [],
        }));
        setEntities(entityList);
        if (entityList.length > 0) {
          setSelectedEntity(entityList[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load entities:', error);
      setEntities([]);
    }
  };

  const loadEntries = async () => {
    if (!id) return;
    try {
      const response = await timetableService.getEntries(id);
      setEntries(response.entries || []);
    } catch (error) {
      console.error('Failed to load entries:', error);
      setEntries([]);
    }
  };

  const loadStatistics = async () => {
    if (!id) return;
    try {
      const response = await timetableService.getStatistics(id);
      setStatistics(response);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const getTimeSlot = (day: string, period: number) => {
    return timeSlots.find(
      (slot) =>
        slot.day_of_week.toLowerCase() === day.toLowerCase() &&
        slot.period_number === period
    );
  };

  const getEntriesForEntity = () => {
    if (!selectedEntity || entries.length === 0) return entries;

    if (viewType === 'class') {
      return entries.filter((entry) => entry.class_id === selectedEntity);
    } else {
      return entries.filter((entry) => entry.teacher_id === selectedEntity);
    }
  };

  const filteredEntries = getEntriesForEntity();

  // Calculate total unique hours (unique time slots)
  const totalHours = React.useMemo(() => {
    const uniqueSlots = new Set(filteredEntries.map(entry => entry.time_slot_id));
    return uniqueSlots.size;
  }, [filteredEntries]);

  const getEntries = (day: string, period: number) => {
    return filteredEntries.filter((entry) =>
      entry.time_slot?.day?.toLowerCase() === day.toLowerCase() &&
      entry.time_slot?.period_number === period
    );
  };

  const periods = Array.from(
    new Set(timeSlots.map((slot) => slot.period_number))
  ).sort((a, b) => a - b);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading timetable...</div>
      </div>
    );
  }

  if (!timetable) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Timetable not found</p>
          <Button onClick={() => navigate('/timetables')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Timetables
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="secondary" onClick={() => navigate('/timetables')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{timetable.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {timetable.academic_year} {timetable.semester && `- ${timetable.semester}`}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            onClick={() => {
              loadStatistics();
              setShowStatistics(true);
            }}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Statistics
          </Button>
          {timetable.violations && timetable.violations.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => setShowViolations(true)}
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              View Violations ({timetable.violations.length})
            </Button>
          )}
          <Button
            variant={isEditMode ? "primary" : "secondary"}
            onClick={() => setIsEditMode(!isEditMode)}
          >
            <Edit3 className="mr-2 h-4 w-4" />
            {isEditMode ? 'View Mode' : 'Edit Mode'}
          </Button>
          <Button variant="secondary">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="secondary">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Edit Mode - Full Grid with Drag & Drop */}
      {isEditMode ? (
        <Card>
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Edit Timetable</h2>
              <p className="text-sm text-gray-600">
                Drag and drop lessons to rearrange the timetable. Consecutive lessons from the same subject will move together. Group lessons will move together automatically.
              </p>
            </div>

            {/* View Type Toggle and Entity Selector for Edit Mode */}
            <div className="mb-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex border border-gray-300 rounded-md overflow-hidden">
                  <button
                    onClick={() => setViewType('class')}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${
                      viewType === 'class'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Class View
                  </button>
                  <button
                    onClick={() => setViewType('teacher')}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${
                      viewType === 'teacher'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Teacher View
                  </button>
                </div>

                <div className="flex-1">
                  <select
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {entities.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Info Banner for Edit Mode */}
              {selectedEntity && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-blue-900">
                          {entities.find(e => e.id === selectedEntity)?.name}
                        </span>
                      </div>
                      <div className="text-xs text-blue-700">
                        <span className="font-medium">Total Hours:</span> {totalHours}
                      </div>
                      {viewType === 'class' && entities.find(e => e.id === selectedEntity)?.homeroom_teacher && (
                        <div className="text-xs text-blue-700">
                          <span className="font-medium">Homeroom Teacher:</span> {entities.find(e => e.id === selectedEntity)?.homeroom_teacher}
                        </div>
                      )}
                      {viewType === 'teacher' && entities.find(e => e.id === selectedEntity)?.homeroom_classes && entities.find(e => e.id === selectedEntity)!.homeroom_classes!.length > 0 && (
                        <div className="text-xs text-blue-700">
                          <span className="font-medium">Homeroom Class{entities.find(e => e.id === selectedEntity)!.homeroom_classes!.length > 1 ? 'es' : ''}:</span> {entities.find(e => e.id === selectedEntity)?.homeroom_classes?.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <TimetableGrid
              timetableId={id!}
              filterType={viewType}
              filterEntityId={selectedEntity}
            />
          </div>
        </Card>
      ) : (
        /* View Mode - Class/Teacher Filtered View */
        <Card>
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setViewType('class')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                viewType === 'class'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Class Schedules
            </button>
            <button
              onClick={() => setViewType('teacher')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                viewType === 'teacher'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Teacher Schedules
            </button>
          </div>

        {/* Entity Selector with Info */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select {viewType === 'class' ? 'Class' : 'Teacher'}
              </label>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Info Banner */}
            {selectedEntity && (
              <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-blue-900">
                      {entities.find(e => e.id === selectedEntity)?.name}
                    </span>
                  </div>
                  <div className="text-xs text-blue-700">
                    <span className="font-medium">Total Hours:</span> {totalHours}
                  </div>
                  {viewType === 'class' && entities.find(e => e.id === selectedEntity)?.homeroom_teacher && (
                    <div className="text-xs text-blue-700">
                      <span className="font-medium">Homeroom Teacher:</span> {entities.find(e => e.id === selectedEntity)?.homeroom_teacher}
                    </div>
                  )}
                  {viewType === 'teacher' && entities.find(e => e.id === selectedEntity)?.homeroom_classes && entities.find(e => e.id === selectedEntity)!.homeroom_classes!.length > 0 && (
                    <div className="text-xs text-blue-700">
                      <span className="font-medium">Homeroom Class{entities.find(e => e.id === selectedEntity)!.homeroom_classes!.length > 1 ? 'es' : ''}:</span> {entities.find(e => e.id === selectedEntity)?.homeroom_classes?.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="p-4">
          {timeSlots.length === 0 ? (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-gray-500 mb-2">No timetable data available</p>
                <p className="text-sm text-gray-400">
                  Please configure time slots and generate the timetable
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700">
                      Time / Day
                    </th>
                    {DAYS.map((day) => (
                      <th
                        key={day}
                        className="border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => {
                    const firstSlot = timeSlots.find((s) => s.period_number === period);
                    return (
                      <tr key={period}>
                        <td className="border border-gray-300 px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700">
                          <div>{firstSlot?.label || `Period ${period}`}</div>
                          {firstSlot && (
                            <div className="text-xs text-gray-500">
                              {firstSlot.start_time} - {firstSlot.end_time}
                            </div>
                          )}
                        </td>
                        {DAYS.map((day) => {
                          const slot = getTimeSlot(day, period);
                          if (!slot) {
                            return (
                              <td
                                key={day}
                                className="border border-gray-300 px-2 py-2 bg-gray-50"
                              />
                            );
                          }

                          if (slot.is_break) {
                            return (
                              <td
                                key={day}
                                className="border border-gray-300 px-2 py-2 bg-yellow-50 text-center"
                              >
                                <span className="text-sm text-yellow-800 font-medium">
                                  Break
                                </span>
                              </td>
                            );
                          }

                          const slotEntries = getEntries(day, period);
                          if (slotEntries.length === 0) {
                            return (
                              <td
                                key={day}
                                className="border border-gray-300 px-2 py-2 hover:bg-blue-50 cursor-pointer"
                              />
                            );
                          }

                          const firstEntry = slotEntries[0];
                          const bgColor = firstEntry.subject_color || '#3B82F6';

                          return (
                            <td
                              key={day}
                              className="border border-gray-300 px-2 py-2 hover:opacity-90 cursor-pointer"
                              style={{ backgroundColor: `${bgColor}20` }}
                            >
                              {slotEntries.map((entry) => (
                                <div key={entry.id} className="text-xs space-y-1 mb-2 last:mb-0">
                                  <div
                                    className="font-semibold"
                                    style={{ color: bgColor }}
                                  >
                                    {entry.subject_short_code || entry.subject_name || 'Subject'}
                                  </div>
                                  {entry.lesson_group_name && (
                                    <div className="text-xs font-medium text-blue-600">
                                      {entry.lesson_group_name}
                                    </div>
                                  )}
                                  <div className="text-gray-700 text-[10px]">
                                    {viewType === 'class'
                                      ? entry.teacher_short_name || entry.teacher_name || 'Teacher'
                                      : entry.class_name || 'Class'}
                                  </div>
                                  {entry.room_short_name || entry.room_name ? (
                                    <div className="text-gray-500 text-[10px]">
                                      {entry.room_short_name || entry.room_name}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
      )}

      {/* Violations Modal */}
      <ViolationsModal
        isOpen={showViolations}
        onClose={() => setShowViolations(false)}
        violations={timetable?.violations || []}
        timetableName={timetable?.name || ''}
      />

      {/* Statistics Modal */}
      {showStatistics && statistics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Timetable Statistics</h2>
              <button
                onClick={() => setShowStatistics(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Hours</p>
                      <p className="text-3xl font-bold text-blue-900">{statistics.summary.total_required_hours}</p>
                      <p className="text-xs text-blue-500 mt-1">{statistics.summary.total_lessons} lessons</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-400" />
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Fully Assigned</p>
                      <p className="text-3xl font-bold text-green-900">{statistics.summary.fully_assigned_hours}</p>
                      <p className="text-xs text-green-500 mt-1">{statistics.summary.fully_assigned_count} lessons</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 font-medium">Partially Assigned</p>
                      <p className="text-3xl font-bold text-yellow-900">{statistics.summary.partially_assigned_hours}</p>
                      <p className="text-xs text-yellow-500 mt-1">{statistics.summary.partially_assigned_count} lessons</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-400" />
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600 font-medium">Unassigned</p>
                      <p className="text-3xl font-bold text-red-900">{statistics.summary.unassigned_hours}</p>
                      <p className="text-xs text-red-500 mt-1">{statistics.summary.unassigned_count} lessons</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-400" />
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Completion Progress</span>
                  <span className="text-sm font-bold text-gray-900">{statistics.summary.completion_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${statistics.summary.completion_percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{statistics.summary.total_assigned_hours} / {statistics.summary.total_required_hours} hours assigned</span>
                  <span>{statistics.summary.total_unassigned_hours} hours remaining</span>
                </div>
              </div>

              {/* Unassigned Lessons */}
              {statistics.unassigned_lessons.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-red-700 mb-3">
                    ⚠️ Unassigned Lessons ({statistics.unassigned_lessons.length})
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-red-200">
                      <thead className="bg-red-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-red-800 uppercase">Class</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-red-800 uppercase">Subject</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-red-800 uppercase">Teacher</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-red-800 uppercase">Required Hours</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-red-800 uppercase">Groups</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-red-100">
                        {statistics.unassigned_lessons.map((lesson: any) => (
                          <tr key={lesson.id} className="hover:bg-red-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{lesson.class_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{lesson.subject_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{lesson.teacher_name || 'No teacher'}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">{lesson.required_hours}h</td>
                            <td className="px-4 py-3 text-sm text-center">{lesson.has_groups ? `Yes (${lesson.num_groups})` : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Partially Assigned Lessons */}
              {statistics.partially_assigned_lessons.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-yellow-700 mb-3">
                    ⏱️ Partially Assigned Lessons ({statistics.partially_assigned_lessons.length})
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-yellow-200">
                      <thead className="bg-yellow-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-yellow-800 uppercase">Class</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-yellow-800 uppercase">Subject</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-yellow-800 uppercase">Teacher</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-yellow-800 uppercase">Assigned</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-yellow-800 uppercase">Required</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-yellow-800 uppercase">Missing</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-yellow-100">
                        {statistics.partially_assigned_lessons.map((lesson: any) => (
                          <tr key={lesson.id} className="hover:bg-yellow-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{lesson.class_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{lesson.subject_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{lesson.teacher_name || 'No teacher'}</td>
                            <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{lesson.assigned_hours}h</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{lesson.required_hours}h</td>
                            <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">{lesson.unassigned_hours}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Fully Assigned Summary */}
              {statistics.fully_assigned_lessons.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-green-700 mb-3">
                    ✅ Fully Assigned Lessons ({statistics.fully_assigned_lessons.length})
                  </h3>
                  <p className="text-sm text-gray-600">
                    All lessons in this category have been successfully assigned to the timetable.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import { ArrowLeft, Search, Save, Users, BookOpen, Filter, AlertCircle } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import {
  timetableService,
  classService,
  teacherService,
  lessonService,
} from '../lib/services';
import api from '../lib/api';
import { useAcademicYear } from '../context/AcademicYearContext';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

// Helper function to capitalize day names for display
const capitalizeDayName = (day: string) => {
  return day.charAt(0).toUpperCase() + day.slice(1);
};

interface Lesson {
  id: string;
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  subject_color?: string;
  teacher_id?: string;
  teacher_name?: string;
  hours_per_week: number;
  lesson_groups?: any[];
}

interface TimeSlot {
  id: string;
  day: string;
  period_number: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
}

interface PlacedLesson {
  id: string;
  lesson: Lesson;
  time_slot_id: string;
  day: string;
  period: number;
}

type ViewMode = 'class' | 'teacher';

export default function ManualTimetableEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedSchoolId } = useAcademicYear();

  const [timetable, setTimetable] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // Store all placed lessons globally (not per entity)
  const [placedLessons, setPlacedLessons] = useState<PlacedLesson[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Get current entity's placed lessons (filtered by view mode)
  const currentPlacedLessons = placedLessons.filter(pl => {
    if (!selectedEntityId) return false;
    if (viewMode === 'class') {
      return pl.lesson.class_id === selectedEntityId;
    } else {
      return pl.lesson.teacher_id === selectedEntityId;
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (id && selectedSchoolId) {
      loadData();
    }
  }, [id, selectedSchoolId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [timetableRes, lessonsRes, classesRes, teachersRes, timeSlotsRes] = await Promise.all([
        timetableService.getById(id!),
        lessonService.getAll(selectedSchoolId!),
        classService.getAll(selectedSchoolId!),
        teacherService.getAll(selectedSchoolId!),
        api.get(`/time-slots/?school_id=${selectedSchoolId}`)
      ]);

      setTimetable(timetableRes);
      setLessons(lessonsRes.lessons || []);
      setClasses(classesRes.classes || []);
      setTeachers(teachersRes.teachers || []);

      // Filter non-break time slots
      const slots = (timeSlotsRes.time_slots || [])
        .filter((ts: any) => !ts.is_break)
        .map((ts: any) => ({
          id: ts.id,
          day: ts.day,
          period_number: ts.period_number,
          start_time: ts.start_time,
          end_time: ts.end_time,
          is_break: ts.is_break
        }));

      setTimeSlots(slots);

      // Load existing entries if timetable is being edited
      if (timetableRes.algorithm === 'manual') {
        try {
          const entriesRes = await timetableService.getEntries(id!);
          if (entriesRes.entries && entriesRes.entries.length > 0) {
            const lessonsList = lessonsRes.lessons || [];
            const loaded = entriesRes.entries
              .map((entry: any) => {
                const lesson = lessonsList.find((l: Lesson) => l.id === entry.lesson_id);
                if (!lesson) return null;

                return {
                  id: entry.id,
                  lesson,
                  time_slot_id: entry.time_slot_id,
                  day: entry.time_slot.day,
                  period: entry.time_slot.period_number
                };
              })
              .filter((p: any) => p !== null);

            setPlacedLessons(loaded);
          }
        } catch (error) {
          console.error('Failed to load existing entries:', error);
        }
      }

      // Select first class by default
      if (classesRes.classes && classesRes.classes.length > 0) {
        setSelectedEntityId(classesRes.classes[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load timetable data');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    if (!selectedEntityId) {
      alert('Please select a class or teacher first');
      return;
    }

    const lessonId = active.id;
    const dropTargetId = over.id; // This is "day-period" format

    // Parse day and period from dropTargetId
    const [day, periodStr] = dropTargetId.split('-');
    const period = parseInt(periodStr, 10);

    // Find the lesson
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    // Check if lesson has reached its weekly hours limit
    const lessonPlacementCount = placedLessons.filter(pl => pl.lesson.id === lesson.id).length;
    if (lessonPlacementCount >= lesson.hours_per_week) {
      alert(`This lesson has already been placed ${lesson.hours_per_week} time(s) (maximum for ${lesson.hours_per_week}h/week). Remove an existing placement first.`);
      return;
    }

    // Find the actual time slot with matching day and period
    const timeSlot = timeSlots.find(ts => ts.day === day && ts.period_number === period);
    if (!timeSlot) {
      alert(`Time slot not found for ${capitalizeDayName(day)} period ${period}`);
      return;
    }

    // Check for conflicts - both class and teacher must be available at this time
    const classConflict = placedLessons.find(pl =>
      pl.day === day &&
      pl.period === period &&
      pl.lesson.class_id === lesson.class_id
    );

    const teacherConflict = lesson.teacher_id ? placedLessons.find(pl =>
      pl.day === day &&
      pl.period === period &&
      pl.lesson.teacher_id === lesson.teacher_id
    ) : null;

    if (classConflict) {
      alert(`Conflict: Class ${lesson.class_name} already has ${classConflict.lesson.subject_name} at this time!`);
      return;
    }

    if (teacherConflict) {
      alert(`Conflict: Teacher ${lesson.teacher_name} already has ${teacherConflict.lesson.subject_name} at this time!`);
      return;
    }

    // Add to global placed lessons
    const newPlacedLesson: PlacedLesson = {
      id: `${lessonId}-${timeSlot.id}-${Date.now()}`,
      lesson,
      time_slot_id: timeSlot.id,
      day: day,
      period: period
    };

    setPlacedLessons([...placedLessons, newPlacedLesson]);
  };

  const handleRemoveLesson = (placedLessonId: string) => {
    setPlacedLessons(placedLessons.filter(pl => pl.id !== placedLessonId));
  };

  const handleSave = async (saveAs: boolean = false) => {
    if (!id) return;

    let targetTimetableId = id;
    let timetableName = timetable?.name;

    if (saveAs) {
      // Ask for new timetable name
      timetableName = prompt('Enter a name for the new timetable:', `${timetable?.name || 'Manual Timetable'} - Copy`);
      if (!timetableName) {
        return; // User cancelled
      }

      // Check if name already exists
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/timetables/?school_id=${selectedSchoolId}`);
        const data = await response.json();
        const exists = data.timetables?.some((t: any) => t.name === timetableName && t.id !== id);
        if (exists) {
          alert(`A timetable with the name "${timetableName}" already exists. Please choose a different name.`);
          return;
        }
      } catch (error) {
        console.error('Failed to check existing names:', error);
      }

      // Create new timetable
      try {
        const createResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/timetables/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_id: selectedSchoolId,
            name: timetableName,
            algorithm: 'manual',
            status: 'completed'
          })
        });
        const newTimetable = await createResponse.json();
        targetTimetableId = newTimetable.id;
      } catch (error) {
        console.error('Failed to create new timetable:', error);
        alert('Failed to create new timetable');
        return;
      }
    } else {
      // Update existing timetable name if needed
      const newName = prompt('Timetable name:', timetable?.name || `Manual Timetable - ${new Date().toLocaleDateString('tr-TR')}`);
      if (!newName) {
        return; // User cancelled
      }
      timetableName = newName;
    }

    setSaving(true);
    try {
      // Update timetable name and status
      await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/timetables/${targetTimetableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: timetableName,
          status: 'completed'
        })
      });

      // Transform all placed lessons to entries format
      const entries = placedLessons.map(pl => ({
        time_slot_id: pl.time_slot_id,
        lesson_id: pl.lesson.id,
        lesson_group_id: null,
        room_id: null
      }));

      // Save entries via API
      const saveResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/timetables/${targetTimetableId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries })
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save entries');
      }

      alert(saveAs ? 'Timetable saved as new copy successfully!' : 'Timetable saved successfully!');

      if (saveAs) {
        // Navigate to the new timetable
        navigate(`/timetables/${targetTimetableId}/manual-edit`);
      } else {
        // Reload current timetable
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to save timetable:', error);
      alert('Failed to save timetable. Please check the console for details.');
    } finally {
      setSaving(false);
    }
  };

  const getFilteredLessons = () => {
    let filtered = lessons;

    if (viewMode === 'class' && selectedEntityId) {
      filtered = filtered.filter(l => l.class_id === selectedEntityId);
    } else if (viewMode === 'teacher' && selectedEntityId) {
      filtered = filtered.filter(l => l.teacher_id === selectedEntityId);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        l.subject_name?.toLowerCase().includes(query) ||
        l.class_name?.toLowerCase().includes(query) ||
        l.teacher_name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const getPlacedLessonsForSlot = (day: string, period: number) => {
    return currentPlacedLessons.filter(pl => pl.day === day && pl.period === period);
  };

  const getPeriods = () => {
    const periods = new Set(timeSlots.map(ts => ts.period_number));
    return Array.from(periods).sort((a, b) => a - b);
  };

  const getTimeRange = (period: number) => {
    const slot = timeSlots.find(ts => ts.period_number === period);
    return slot ? `${slot.start_time} - ${slot.end_time}` : '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const periods = getPeriods();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/timetables')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Manual Timetable Editor</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedEntityId ? (
                      viewMode === 'class'
                        ? classes.find(c => c.id === selectedEntityId)?.name
                        : teachers.find(t => t.id === selectedEntityId)?.full_name || teachers.find(t => t.id === selectedEntityId)?.first_name
                    ) : 'Select a class or teacher'} - Drag and drop lessons to schedule
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => handleSave(false)} disabled={saving} variant="primary">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button onClick={() => handleSave(true)} disabled={saving} variant="secondary">
                  <Save className="mr-2 h-4 w-4" />
                  Save As...
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100vh-120px)]">
          {/* Left Panel - Lesson Pool */}
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Lesson Pool</h2>

              {/* Current Selection Display */}
              {selectedEntityId && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-xs font-medium text-blue-700 mb-1">Currently Editing:</div>
                  <div className="text-sm font-bold text-blue-900">
                    {viewMode === 'class'
                      ? classes.find(c => c.id === selectedEntityId)?.name || 'Unknown'
                      : teachers.find(t => t.id === selectedEntityId)?.full_name ||
                        teachers.find(t => t.id === selectedEntityId)?.first_name || 'Unknown'}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {currentPlacedLessons.length} lesson(s) scheduled
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search lessons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* View Mode Selector */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => {
                    setViewMode('class');
                    setSelectedEntityId(classes.length > 0 ? classes[0].id : '');
                  }}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'class'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <BookOpen className="inline h-4 w-4 mr-1" />
                  Class
                </button>
                <button
                  onClick={() => {
                    setViewMode('teacher');
                    setSelectedEntityId(teachers.length > 0 ? teachers[0].id : '');
                  }}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'teacher'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Users className="inline h-4 w-4 mr-1" />
                  Teacher
                </button>
              </div>

              {/* Entity Selector */}
              {viewMode === 'class' ? (
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                >
                  <option value="">Select a class...</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                >
                  <option value="">Select a teacher...</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name || `${teacher.first_name} ${teacher.last_name}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Lessons List */}
            <div className="p-4 space-y-2">
              {getFilteredLessons().map(lesson => {
                const placedCount = placedLessons.filter(pl => pl.lesson.id === lesson.id).length;
                return (
                  <LessonCard key={lesson.id} lesson={lesson} placedCount={placedCount} />
                );
              })}
              {getFilteredLessons().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="mx-auto h-12 w-12 mb-2 text-gray-400" />
                  <p>No lessons found</p>
                  <p className="text-sm">Try changing the filter or search criteria</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Timetable Grid */}
          <div className="flex-1 overflow-auto p-6">
            <Card>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        Time
                      </th>
                      {DAYS.map(day => (
                        <th key={day} className="px-4 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                          {capitalizeDayName(day)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map(period => (
                      <tr key={period} className="border-t border-gray-200">
                        <td className="px-4 py-2 bg-gray-50 border-r border-gray-200">
                          <div className="text-sm font-medium text-gray-900">Period {period}</div>
                          <div className="text-xs text-gray-500">{getTimeRange(period)}</div>
                        </td>
                        {DAYS.map(day => {
                          const slotId = `${day}-${period}`;
                          const placedInSlot = getPlacedLessonsForSlot(day, period);

                          return (
                            <td key={day} className="border-r border-gray-200">
                              <TimeSlotDropZone
                                id={slotId}
                                placedLessons={placedInSlot}
                                onRemove={handleRemoveLesson}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId ? (
          (() => {
            const lesson = lessons.find(l => l.id === activeId);
            if (!lesson) return null;
            const overlayColor = lesson.subject_color || '#3B82F6';
            return (
              <div
                className="p-3 shadow-lg rounded-md border-2 cursor-grabbing"
                style={{
                  borderColor: overlayColor,
                  backgroundColor: `${overlayColor}20`
                }}
              >
                <div className="font-medium text-sm">{lesson.subject_name}</div>
                <div className="text-xs text-gray-600">{lesson.class_name}</div>
                <div className="text-xs text-gray-500">{lesson.teacher_name}</div>
              </div>
            );
          })()
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Lesson Card Component (Draggable)
function LessonCard({ lesson, placedCount }: { lesson: Lesson; placedCount: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lesson.id,
  });

  // Get color from subject or default
  const cardColor = lesson.subject_color || '#3B82F6';
  const isComplete = placedCount >= lesson.hours_per_week;
  const remaining = lesson.hours_per_week - placedCount;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-3 rounded-md border-2 transition-all ${
        isComplete
          ? 'opacity-40 cursor-not-allowed border-gray-300'
          : isDragging
          ? 'opacity-50 border-blue-500 cursor-grabbing'
          : 'border-gray-200 hover:border-blue-400 hover:shadow-md cursor-grab active:cursor-grabbing'
      }`}
      style={{
        borderLeftColor: cardColor,
        borderLeftWidth: '4px',
        backgroundColor: isComplete ? '#f3f4f6' : `${cardColor}10`
      }}
    >
      <div className="font-medium text-sm text-gray-900">{lesson.subject_name}</div>
      <div className="text-xs text-gray-600 mt-1">{lesson.class_name}</div>
      {lesson.teacher_name && (
        <div className="text-xs text-gray-500 mt-1">{lesson.teacher_name}</div>
      )}
      <div className="flex items-center justify-between mt-1">
        <div className="text-xs font-semibold" style={{ color: isComplete ? '#9CA3AF' : cardColor }}>
          {lesson.hours_per_week}h/week
        </div>
        <div className={`text-xs font-bold ${isComplete ? 'text-green-600' : 'text-orange-600'}`}>
          {placedCount}/{lesson.hours_per_week} {isComplete ? '✓' : `(${remaining} left)`}
        </div>
      </div>
    </div>
  );
}

// Time Slot Drop Zone Component
function TimeSlotDropZone({
  id,
  placedLessons,
  onRemove
}: {
  id: string;
  placedLessons: PlacedLesson[];
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] p-2 transition-colors ${
        isOver ? 'bg-blue-50 border-2 border-dashed border-blue-400' : 'bg-white'
      }`}
    >
      {placedLessons.length === 0 ? (
        <div className="h-full flex items-center justify-center text-xs text-gray-400">
          Drop here
        </div>
      ) : (
        <div className="space-y-2">
          {placedLessons.map(pl => {
            const lessonColor = pl.lesson.subject_color || '#3B82F6';
            return (
              <div
                key={pl.id}
                className="p-2 rounded border-l-4 shadow-sm group relative"
                style={{
                  borderLeftColor: lessonColor,
                  backgroundColor: `${lessonColor}15`
                }}
              >
                <div className="font-medium text-xs">{pl.lesson.subject_name}</div>
                <div className="text-xs text-gray-600">{pl.lesson.class_name}</div>
                {pl.lesson.teacher_name && (
                  <div className="text-xs text-gray-500">{pl.lesson.teacher_name}</div>
                )}
                <button
                  onClick={() => onRemove(pl.id)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-1"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

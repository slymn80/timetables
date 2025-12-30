import { useState, useEffect } from 'react';
import { Plus, Minus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import Card from '../components/common/Card';
import SchoolFilterBanner from '../components/common/SchoolFilterBanner';
import { useAcademicYear } from '../context/AcademicYearContext';
import { lessonService, classService, subjectService } from '../lib/services';
import type { Class, Subject } from '../types';

interface ClassLesson {
  id: string;
  subject_id: string;
  subject_name: string;
  hours_per_week: number;
  num_groups: number;
  requires_double_period: boolean;
}

export default function Lessons() {
  const { selectedSchoolId } = useAcademicYear();
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [classLessons, setClassLessons] = useState<ClassLesson[]>([]);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedSchoolId) {
      loadInitialData();
    } else {
      setLoading(false);
    }
  }, [selectedSchoolId]);

  useEffect(() => {
    if (selectedClass) {
      loadClassLessons(selectedClass.id);
    }
  }, [selectedClass]);

  const loadInitialData = async () => {
    try {
      const [classesRes, subjectsRes, lessonsRes] = await Promise.all([
        classService.getAll(selectedSchoolId!),
        subjectService.getAll(selectedSchoolId!),
        lessonService.getAll(selectedSchoolId!),
      ]);

      setClasses(classesRes.classes || []);
      setSubjects(subjectsRes.subjects || []);
      setAllLessons(lessonsRes.lessons || []);

      // Auto-select first class
      if (classesRes.classes && classesRes.classes.length > 0) {
        setSelectedClass(classesRes.classes[0]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClassLessons = async (classId: string) => {
    try {
      const response = await lessonService.getAll(selectedSchoolId!);
      const lessons = response.lessons || [];

      const filteredLessons = lessons.filter((l: any) => l.class_id === classId);

      // Group lessons by subject_id to handle split lessons
      const groupedMap = new Map<string, any>();

      filteredLessons.forEach((l: any) => {
        const key = l.subject_id;
        if (!groupedMap.has(key)) {
          // Use first lesson as the representative
          groupedMap.set(key, {
            id: l.id,
            subject_id: l.subject_id,
            subject_name: l.subject_name || 'Unknown',
            hours_per_week: l.hours_per_week || 0,
            num_groups: l.num_groups || 1,
            requires_double_period: l.requires_double_period || false,
          });
        }
      });

      const lessonsArray = Array.from(groupedMap.values());
      setClassLessons(lessonsArray);
    } catch (error) {
      console.error('Failed to load class lessons:', error);
    }
  };

  const getTotalHours = () => {
    return classLessons.reduce((sum, lesson) => sum + lesson.hours_per_week, 0);
  };

  const getHoursStatusColor = () => {
    if (!selectedClass) return 'text-gray-500';
    const total = getTotalHours();
    const maxHours = selectedClass.max_hours_per_day ? selectedClass.max_hours_per_day * 5 : 35; // Assume 5 days

    if (total >= maxHours) return 'text-green-600';
    return 'text-red-600';
  };

  const handleAddSubject = async (subject: Subject) => {
    if (!selectedClass) return;

    try {
      const numGroups = subject.default_num_groups || 1;

      const response = await lessonService.create({
        class_id: selectedClass.id,
        subject_id: subject.id,
        teacher_id: undefined,
        hours_per_week: subject.default_weekly_hours || 2,
        num_groups: numGroups,
        can_split: subject.can_split_groups || false,
        requires_double_period: false,
        allow_consecutive: true,
      });

      // If num_groups > 1, call split-groups endpoint to create individual lesson records
      if (numGroups > 1 && response.id) {
        await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/lessons/${response.id}/split-groups?num_groups=${numGroups}`, {
          method: 'POST',
        });
      }

      await loadInitialData();
      await loadClassLessons(selectedClass.id);
    } catch (error) {
      console.error('Failed to assign subject:', error);
      alert('Failed to assign subject to class');
    }
  };

  const handleRemoveSubject = async (lessonId: string, subjectId: string) => {
    if (!selectedClass) return;

    try {
      // Delete all lessons for this class+subject combination
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/lessons/by-class-subject?class_id=${selectedClass.id}&subject_id=${subjectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to remove subject';
        try {
          const error = await response.json();
          errorMessage = error.detail || JSON.stringify(error);
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      await loadInitialData();
      await loadClassLessons(selectedClass.id);
    } catch (error) {
      console.error('Failed to remove subject:', error);
      alert(error instanceof Error ? error.message : 'Failed to remove subject');
    }
  };

  const isSubjectAssigned = (subjectId: string) => {
    return classLessons.some(l => l.subject_id === subjectId);
  };

  // Calculate overall progress
  const getOverallProgress = () => {
    const classesWithLessons = classes.filter(cls => {
      return allLessons.some(l => l.class_id === cls.id);
    }).length;

    const totalClasses = classes.length;
    const percentage = totalClasses > 0 ? (classesWithLessons / totalClasses) * 100 : 0;

    return {
      completed: classesWithLessons,
      total: totalClasses,
      percentage: Math.round(percentage)
    };
  };

  return (
    <div>
      <SchoolFilterBanner />

      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Lesson Assignments</h1>
          <p className="text-gray-600 mt-1">Select a class and assign subjects to it</p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <>
          {/* Overall Progress Bar */}
          <div className="mb-6">
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getOverallProgress().percentage === 100 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">Overall Progress</h3>
                  </div>
                  <div className="text-sm font-medium text-gray-600">
                    {getOverallProgress().completed} / {getOverallProgress().total} classes have lessons
                  </div>
                </div>
                <div className="relative w-full h-6 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      getOverallProgress().percentage === 100
                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                        : getOverallProgress().percentage >= 50
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                        : 'bg-gradient-to-r from-orange-500 to-orange-600'
                    }`}
                    style={{ width: `${getOverallProgress().percentage}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-white drop-shadow-lg">
                      {getOverallProgress().percentage}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left: Classes List */}
          <div className="col-span-4">
            <Card>
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Classes</h2>
              </div>
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {classes.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No classes found</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {classes.sort((a, b) => {
                      const aNum = parseInt(a.name.match(/\d+/)?.[0] || "0");
                      const bNum = parseInt(b.name.match(/\d+/)?.[0] || "0");
                      return aNum - bNum || a.name.localeCompare(b.name);
                    }).map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => setSelectedClass(cls)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                          selectedClass?.id === cls.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900">{cls.name}</div>
                        <div className="text-sm text-gray-500">
                          Grade: {cls.grade_level || 'N/A'} • Students: {cls.student_count || 0}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Middle: Assigned Subjects */}
          <div className="col-span-4">
            <Card>
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedClass ? `${selectedClass.name}` : 'Select a Class'}
                  </h2>
                  {selectedClass && (
                    <div className={`flex items-center font-semibold ${getHoursStatusColor()}`}>
                      <Clock className="h-4 w-4 mr-1" />
                      {getTotalHours()} hours/week
                    </div>
                  )}
                </div>
                {selectedClass && (
                  <div className="mt-1 text-xs text-gray-500">
                    Target: {selectedClass.max_hours_per_day ? selectedClass.max_hours_per_day * 5 : 35} hours/week
                  </div>
                )}
              </div>
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {!selectedClass ? (
                  <div className="p-4 text-center text-gray-500">
                    Please select a class from the left
                  </div>
                ) : classLessons.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No subjects assigned yet. Select subjects from the right panel.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {classLessons.sort((a, b) => a.subject_name.localeCompare(b.subject_name)).map((lesson) => {
                      const subject = subjects.find(s => s.id === lesson.subject_id);
                      const isGrouped = subject?.can_split_groups || false;
                      return (
                        <div
                          key={lesson.id}
                          className={`p-4 ${isGrouped ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-gray-900">
                                  {lesson.subject_name}
                                </div>
                                {isGrouped && (
                                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-xs rounded font-semibold">
                                    Groups
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                <span className="font-semibold">{lesson.hours_per_week} hrs/week</span>
                                {lesson.num_groups > 1 && ` • ${lesson.num_groups} groups`}
                                {lesson.requires_double_period && ' • Double period'}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveSubject(lesson.id, lesson.subject_id)}
                              className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Remove subject"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right: Available Subjects */}
          <div className="col-span-4">
            <Card>
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Available Subjects</h2>
              </div>
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {subjects.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No subjects available</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {subjects.sort((a, b) => a.name.localeCompare(b.name)).map((subject) => {
                      const assigned = isSubjectAssigned(subject.id);
                      return (
                        <div
                          key={subject.id}
                          className={`p-4 ${assigned ? 'opacity-50' : ''} ${subject.can_split_groups ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-gray-900">{subject.name}</div>
                                {subject.can_split_groups && (
                                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-xs rounded font-semibold">
                                    Groups
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {subject.short_code}
                                {subject.default_weekly_hours && ` • ${subject.default_weekly_hours} hrs/week`}
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddSubject(subject)}
                              disabled={!selectedClass || assigned}
                              className={`ml-2 p-1 rounded ${
                                !selectedClass || assigned
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={assigned ? 'Already assigned' : 'Add to class'}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

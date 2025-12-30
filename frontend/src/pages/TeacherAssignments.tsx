import { useState, useEffect } from 'react';
import { Plus, Minus, Clock, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import Card from '../components/common/Card';
import SchoolFilterBanner from '../components/common/SchoolFilterBanner';
import { useAcademicYear } from '../context/AcademicYearContext';
import { lessonService, classService, teacherService, lessonGroupService } from '../lib/services';
import type { Class, Teacher } from '../types';

interface LessonGroup {
  id: string;
  lesson_id: string;
  group_number: number;
  teacher_id: string | null;
  teacher_name: string | null;
  color: string;
}

interface ClassLesson {
  id: string;
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  teacher_id: string | null;
  teacher_name: string | null;
  hours_per_week: number;
  num_groups: number;
  lesson_groups: LessonGroup[];
}

export default function TeacherAssignments() {
  const { selectedSchoolId } = useAcademicYear();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [classLessons, setClassLessons] = useState<ClassLesson[]>([]);
  const [teacherLessons, setTeacherLessons] = useState<ClassLesson[]>([]);
  const [allLessonsData, setAllLessonsData] = useState<ClassLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedSchoolId) {
      loadInitialData();
    } else {
      setLoading(false);
    }
  }, [selectedSchoolId]);

  useEffect(() => {
    if (selectedTeacher) {
      loadTeacherLessons(selectedTeacher.id);
    }
  }, [selectedTeacher]);

  useEffect(() => {
    if (selectedClass) {
      loadClassLessons(selectedClass.id);
    }
  }, [selectedClass]);

  const loadInitialData = async (preserveSelection = false) => {
    try {
      // Mevcut seçimleri kaydet
      const currentTeacherId = selectedTeacher?.id;
      const currentClassId = selectedClass?.id;

      const [teachersRes, classesRes, lessonsRes] = await Promise.all([
        teacherService.getAll(selectedSchoolId!),
        classService.getAll(selectedSchoolId!),
        lessonService.getAll(selectedSchoolId!),
      ]);

      const newTeachers = teachersRes.teachers || [];
      const newClasses = classesRes.classes || [];

      setTeachers(newTeachers);
      setClasses(newClasses);

      // Load all lessons with groups
      const lessons = lessonsRes.lessons || [];
      const lessonsByKey = new Map<string, any[]>();
      lessons.forEach((lesson: any) => {
        const key = `${lesson.class_id}-${lesson.subject_id}`;
        if (!lessonsByKey.has(key)) {
          lessonsByKey.set(key, []);
        }
        lessonsByKey.get(key)!.push(lesson);
      });

      // Process each unique lesson
      const allLessons = await Promise.all(
        Array.from(lessonsByKey.entries()).map(async ([key, groupedLessons]) => {
          const baseLesson = groupedLessons[0];
          let lessonGroups: LessonGroup[] = [];

          if (baseLesson.num_groups > 1) {
            try {
              const groupsResponse = await lessonGroupService.getByLesson(baseLesson.id);
              lessonGroups = groupsResponse.groups || [];
            } catch (error) {
              console.error(`Failed to load groups for lesson ${baseLesson.id}:`, error);
            }
          }

          return {
            id: baseLesson.id,
            class_id: baseLesson.class_id,
            class_name: baseLesson.class_name || 'Unknown',
            subject_id: baseLesson.subject_id,
            subject_name: baseLesson.subject_name || 'Unknown',
            teacher_id: baseLesson.teacher_id || null,
            teacher_name: baseLesson.teacher_name || null,
            hours_per_week: baseLesson.hours_per_week || 0,
            num_groups: baseLesson.num_groups || 1,
            lesson_groups: lessonGroups,
          };
        })
      );

      setAllLessonsData(allLessons);

      if (preserveSelection) {
        // Seçimleri koru - ID bazında tekrar bul
        if (currentTeacherId) {
          const teacher = newTeachers.find(t => t.id === currentTeacherId);
          if (teacher) {
            setSelectedTeacher(teacher);
          }
        }
        if (currentClassId) {
          const cls = newClasses.find(c => c.id === currentClassId);
          if (cls) {
            setSelectedClass(cls);
          }
        }
      } else {
        // Auto-select first teacher
        if (newTeachers.length > 0) {
          setSelectedTeacher(newTeachers[0]);
        }

        // Auto-select first class
        if (newClasses.length > 0) {
          setSelectedClass(newClasses[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClassLessons = async (classId: string) => {
    try {
      const response = await lessonService.getAll();
      const lessons = response.lessons || [];

      const filteredLessons = lessons.filter((l: any) => l.class_id === classId);

      // Group lessons by subject_id to combine duplicate entries
      const lessonsBySubject = new Map<string, any[]>();
      filteredLessons.forEach((lesson: any) => {
        if (!lessonsBySubject.has(lesson.subject_id)) {
          lessonsBySubject.set(lesson.subject_id, []);
        }
        lessonsBySubject.get(lesson.subject_id)!.push(lesson);
      });

      // Process each unique subject
      const classLessonsData: ClassLesson[] = await Promise.all(
        Array.from(lessonsBySubject.entries()).map(async ([subjectId, subjectLessons]) => {
          // Use the first lesson as the base
          const baseLesson = subjectLessons[0];
          let lessonGroups: LessonGroup[] = [];

          // Fetch groups if lesson has multiple groups
          if (baseLesson.num_groups > 1) {
            try {
              const groupsResponse = await lessonGroupService.getByLesson(baseLesson.id);
              lessonGroups = groupsResponse.groups || [];
            } catch (error) {
              console.error(`Failed to load groups for lesson ${baseLesson.id}:`, error);
            }
          }

          return {
            id: baseLesson.id,
            class_id: baseLesson.class_id,
            class_name: baseLesson.class_name || 'Unknown',
            subject_id: baseLesson.subject_id,
            subject_name: baseLesson.subject_name || 'Unknown',
            teacher_id: baseLesson.teacher_id || null,
            teacher_name: baseLesson.teacher_name || null,
            hours_per_week: baseLesson.hours_per_week || 0,
            num_groups: baseLesson.num_groups || 1,
            lesson_groups: lessonGroups,
          };
        })
      );

      setClassLessons(classLessonsData);
    } catch (error) {
      console.error('Failed to load class lessons:', error);
    }
  };

  const loadTeacherLessons = async (teacherId: string) => {
    try {
      const response = await lessonService.getAll();
      const lessons = response.lessons || [];

      // Group lessons by subject_id and class_id to combine duplicate entries
      const lessonsByKey = new Map<string, any[]>();
      lessons.forEach((lesson: any) => {
        const key = `${lesson.class_id}-${lesson.subject_id}`;
        if (!lessonsByKey.has(key)) {
          lessonsByKey.set(key, []);
        }
        lessonsByKey.get(key)!.push(lesson);
      });

      // Process each unique lesson
      const allLessons = await Promise.all(
        Array.from(lessonsByKey.entries()).map(async ([key, groupedLessons]) => {
          // Use the first lesson as the base
          const baseLesson = groupedLessons[0];
          let lessonGroups: LessonGroup[] = [];

          // Fetch groups if lesson has multiple groups
          if (baseLesson.num_groups > 1) {
            try {
              const groupsResponse = await lessonGroupService.getByLesson(baseLesson.id);
              lessonGroups = groupsResponse.groups || [];
            } catch (error) {
              console.error(`Failed to load groups for lesson ${baseLesson.id}:`, error);
            }
          }

          return {
            id: baseLesson.id,
            class_id: baseLesson.class_id,
            class_name: baseLesson.class_name || 'Unknown',
            subject_id: baseLesson.subject_id,
            subject_name: baseLesson.subject_name || 'Unknown',
            teacher_id: baseLesson.teacher_id || null,
            teacher_name: baseLesson.teacher_name || null,
            hours_per_week: baseLesson.hours_per_week || 0,
            num_groups: baseLesson.num_groups || 1,
            lesson_groups: lessonGroups,
          };
        })
      );

      // Filter lessons where teacher is assigned (either main or any group)
      const relevantLessons = allLessons.filter((lesson) => {
        const isMainTeacher = lesson.teacher_id === teacherId;
        const hasGroupAssignment = lesson.lesson_groups.some((g) => g.teacher_id === teacherId);
        return isMainTeacher || hasGroupAssignment;
      });

      setTeacherLessons(relevantLessons);
    } catch (error) {
      console.error('Failed to load teacher lessons:', error);
    }
  };

  // Calculate total hours for any teacher (not just selected)
  const calculateTotalHours = (teacherId: string) => {
    // Sum up hours from all lessons
    const lessonHours = allLessonsData.reduce((sum, lesson) => {
      // For normal lessons, check if teacher_id matches
      if (lesson.num_groups <= 1) {
        return lesson.teacher_id === teacherId ? sum + lesson.hours_per_week : sum;
      }

      // For group lessons, check if teacher has any groups assigned
      const hasGroupAssignment = lesson.lesson_groups.some((g) => g.teacher_id === teacherId);
      return hasGroupAssignment ? sum + lesson.hours_per_week : sum;
    }, 0);

    // Check if teacher is homeroom teacher (class teacher)
    const homeroomHours = classes.filter(cls => cls.homeroom_teacher_id === teacherId).length;

    return lessonHours + homeroomHours;
  };

  const handleAssignTeacher = async (lessonId: string) => {
    if (!selectedTeacher) return;

    try {
      const lesson = classLessons.find((l) => l.id === lessonId);
      if (!lesson) return;

      // If lesson has groups, assign to first unassigned group
      if (lesson.num_groups > 1 && lesson.lesson_groups.length > 0) {
        // Find first unassigned group (regardless of which teacher)
        const unassignedGroup = lesson.lesson_groups.find((g) => !g.teacher_id);
        if (!unassignedGroup) {
          alert('All groups are already assigned to teachers');
          return;
        }

        // Assign selected teacher to this group
        await lessonGroupService.assignTeacher(unassignedGroup.id, selectedTeacher.id);
      } else {
        // Single lesson, assign to main lesson
        await lessonService.update(lessonId, {
          teacher_id: selectedTeacher.id,
        });
      }

      // Reload all data to update hours (preserve selection)
      await loadInitialData(true);

      // Reload lessons
      if (selectedClass) {
        await loadClassLessons(selectedClass.id);
      }
      if (selectedTeacher) {
        await loadTeacherLessons(selectedTeacher.id);
      }
    } catch (error) {
      console.error('Failed to assign teacher:', error);
      alert('Failed to assign teacher to lesson');
    }
  };

  const handleUnassignTeacher = async (lessonId: string) => {
    if (!selectedTeacher) return;

    try {
      const lesson = classLessons.find((l) => l.id === lessonId);
      if (!lesson) return;

      // If lesson has groups, remove teacher from the last assigned group
      if (lesson.num_groups > 1 && lesson.lesson_groups.length > 0) {
        const assignedGroups = lesson.lesson_groups
          .filter((g) => g.teacher_id === selectedTeacher.id)
          .sort((a, b) => b.group_number - a.group_number); // Remove from highest group number first

        if (assignedGroups.length > 0) {
          await lessonGroupService.update(assignedGroups[0].id, { teacher_id: null });
        }
      } else {
        // Single lesson, remove from main lesson
        await lessonService.update(lessonId, {
          teacher_id: null,
        });
      }

      // Reload all data to update hours (preserve selection)
      await loadInitialData(true);

      // Reload lessons
      if (selectedClass) {
        await loadClassLessons(selectedClass.id);
      }
      if (selectedTeacher) {
        await loadTeacherLessons(selectedTeacher.id);
      }
    } catch (error) {
      console.error('Failed to unassign teacher:', error);
      alert('Failed to unassign teacher');
    }
  };

  const handleRemoveFromTeacher = async (lessonId: string) => {
    if (!selectedTeacher) return;

    try {
      const lesson = teacherLessons.find((l) => l.id === lessonId);
      if (!lesson) {
        console.error('Lesson not found:', lessonId);
        return;
      }

      console.log('Removing lesson:', lesson);

      // If lesson has groups, remove teacher from ONE assigned group (the last one)
      if (lesson.num_groups > 1 && lesson.lesson_groups.length > 0) {
        const assignedGroups = lesson.lesson_groups
          .filter((g) => g.teacher_id === selectedTeacher.id)
          .sort((a, b) => b.group_number - a.group_number); // Sort descending to get last group

        if (assignedGroups.length > 0) {
          console.log('Removing from one group:', assignedGroups[0]);
          const response = await lessonGroupService.update(assignedGroups[0].id, { teacher_id: null });
          console.log('Group update response:', response);
        }
      } else {
        // Single lesson, remove from main lesson
        console.log('Updating single lesson:', lessonId);
        const response = await lessonService.update(lessonId, { teacher_id: null });
        console.log('Lesson update response:', response);
      }

      // Reload all data to update hours (preserve selection)
      await loadInitialData(true);

      // Reload lessons
      if (selectedClass) {
        await loadClassLessons(selectedClass.id);
      }
      if (selectedTeacher) {
        await loadTeacherLessons(selectedTeacher.id);
      }
    } catch (error: any) {
      console.error('Failed to remove lesson from teacher:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert(`Failed to remove lesson from teacher: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleClearAllLessons = async () => {
    if (!selectedTeacher) return;

    const confirmed = window.confirm(
      `${selectedTeacher.first_name} ${selectedTeacher.last_name} öğretmeninin tüm derslerini kaldırmak istediğinize emin misiniz?`
    );

    if (!confirmed) return;

    try {
      // Unassign all lessons for this teacher
      for (const lesson of teacherLessons) {
        // If lesson has groups, remove teacher from all assigned groups
        if (lesson.num_groups > 1 && lesson.lesson_groups.length > 0) {
          const assignedGroups = lesson.lesson_groups.filter(
            (g) => g.teacher_id === selectedTeacher.id
          );

          for (const group of assignedGroups) {
            await lessonGroupService.update(group.id, { teacher_id: null });
          }
        } else {
          // Single lesson, remove from main lesson
          await lessonService.update(lesson.id, {
            teacher_id: null,
          });
        }
      }

      // Reload all data to update hours (preserve selection)
      await loadInitialData(true);

      // Reload lessons
      if (selectedClass) {
        await loadClassLessons(selectedClass.id);
      }
      if (selectedTeacher) {
        await loadTeacherLessons(selectedTeacher.id);
      }

      alert('Tüm dersler başarıyla kaldırıldı.');
    } catch (error) {
      console.error('Failed to clear all lessons:', error);
      alert('Dersleri kaldırma işlemi başarısız oldu.');
    }
  };

  const handleClearAllTeachersAssignments = async () => {
    const confirmed = window.confirm(
      'TÜM ÖĞRETMENLERİN TÜM DERSLERİNİ KALDIRMAK İSTEDİĞİNİZE EMİN MİSİNİZ?\n\nBu işlem geri alınamaz!'
    );

    if (!confirmed) return;

    try {
      // Clear all lesson assignments
      for (const lesson of allLessonsData) {
        // If lesson has groups, remove all teachers from all groups
        if (lesson.num_groups > 1 && lesson.lesson_groups.length > 0) {
          for (const group of lesson.lesson_groups) {
            if (group.teacher_id) {
              await lessonGroupService.update(group.id, { teacher_id: null });
            }
          }
        } else {
          // Single lesson, remove teacher if assigned
          if (lesson.teacher_id) {
            await lessonService.update(lesson.id, { teacher_id: null });
          }
        }
      }

      // Reload all data (preserve selection)
      await loadInitialData(true);

      // Reload lessons
      if (selectedClass) {
        await loadClassLessons(selectedClass.id);
      }
      if (selectedTeacher) {
        await loadTeacherLessons(selectedTeacher.id);
      }

      alert('Tüm öğretmen atamaları başarıyla kaldırıldı.');
    } catch (error) {
      console.error('Failed to clear all teacher assignments:', error);
      alert('Tüm atamaları kaldırma işlemi başarısız oldu.');
    }
  };

  const isAssignedToSelectedTeacher = (lesson: ClassLesson) => {
    if (!selectedTeacher) return false;

    // Check if assigned to main lesson
    if (lesson.teacher_id === selectedTeacher.id) return true;

    // Check if assigned to any group
    if (lesson.num_groups > 1 && lesson.lesson_groups.length > 0) {
      return lesson.lesson_groups.some((g) => g.teacher_id === selectedTeacher.id);
    }

    return false;
  };

  const getGroupAssignmentInfo = (lesson: ClassLesson) => {
    if (lesson.num_groups <= 1) return null;

    const assignedGroups = lesson.lesson_groups.filter((g) => g.teacher_id).length;
    const totalGroups = lesson.num_groups;

    return { assignedGroups, totalGroups };
  };


  const isHomeroomTeacher = (teacherId: string) => {
    return classes.some(cls => cls.homeroom_teacher_id === teacherId);
  };

  const getHomeroomClasses = (teacherId: string) => {
    return classes.filter(cls => cls.homeroom_teacher_id === teacherId);
  };

  // Calculate overall teacher assignment progress
  const getOverallProgress = () => {
    let totalHours = 0;
    let assignedHours = 0;

    allLessonsData.forEach((lesson) => {
      const hours = lesson.hours_per_week || 0;
      totalHours += hours;

      // For normal lessons, check if teacher_id exists
      if (lesson.num_groups <= 1) {
        if (lesson.teacher_id) assignedHours += hours;
      } else {
        // For group lessons, check if all groups have teachers
        const allGroupsAssigned = lesson.lesson_groups.every((g) => g.teacher_id !== null);
        if (allGroupsAssigned) assignedHours += hours;
      }
    });

    const percentage = totalHours > 0 ? (assignedHours / totalHours) * 100 : 0;

    return {
      assigned: assignedHours,
      total: totalHours,
      percentage: Math.round(percentage)
    };
  };

  // Get class assignment info (assigned hours vs total hours) - works for any class
  const getClassAssignmentInfo = (classId: string) => {
    // Use allLessonsData instead of classLessons so it works for all classes
    const lessons = allLessonsData.filter(l => l.class_id === classId);

    const assignedHours = lessons.reduce((sum, lesson) => {
      // For normal lessons, check if teacher_id exists
      if (lesson.num_groups <= 1) {
        return lesson.teacher_id ? sum + lesson.hours_per_week : sum;
      }

      // For group lessons, check if at least one group has a teacher
      const hasAnyAssignment = lesson.lesson_groups.some((g) => g.teacher_id !== null);
      return hasAnyAssignment ? sum + lesson.hours_per_week : sum;
    }, 0);

    const totalHours = lessons.reduce((sum, l) => sum + l.hours_per_week, 0);
    return { assignedHours, totalHours };
  };

  return (
    <div>
      <SchoolFilterBanner />

      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teacher Assignments</h1>
            <p className="text-gray-600 mt-1">Assign teachers to class lessons</p>
          </div>
          <button
            onClick={handleClearAllTeachersAssignments}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Tüm Atamaları Kaldır
          </button>
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
                    <h3 className="text-lg font-semibold text-gray-900">Teacher Assignment Progress</h3>
                  </div>
                  <div className="text-sm font-medium text-gray-600">
                    {getOverallProgress().assigned} / {getOverallProgress().total} hours assigned
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

        <div className="grid grid-cols-12 gap-4">
          {/* Column 1: Teachers List */}
          <div className="col-span-3">
            <Card>
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Teachers</h2>
              </div>
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {teachers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No teachers found</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {teachers.sort((a, b) => {
                      const aName = `${a.first_name} ${a.last_name}`;
                      const bName = `${b.first_name} ${b.last_name}`;
                      return aName.localeCompare(bName);
                    }).map((teacher, index) => {
                      const totalHours = calculateTotalHours(teacher.id);
                      // Color coding based on hours
                      const getHoursColor = () => {
                        if (totalHours === 0) return 'text-gray-400';
                        if (totalHours <= 10) return 'text-green-600';
                        if (totalHours <= 20) return 'text-blue-600';
                        if (totalHours <= 30) return 'text-orange-600';
                        return 'text-red-600';
                      };

                      return (
                        <button
                          key={teacher.id}
                          onClick={() => setSelectedTeacher(teacher)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                            selectedTeacher?.id === teacher.id
                              ? 'bg-blue-50 border-l-4 border-blue-600'
                              : index % 2 === 0
                              ? 'bg-white'
                              : 'bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {teacher.first_name} {teacher.last_name}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {teacher.subject_areas && teacher.subject_areas.length > 0 && (
                                  <div className="text-xs text-purple-600">
                                    {teacher.subject_areas.join(', ')}
                                  </div>
                                )}
                                <div className={`flex items-center ${getHoursColor()} font-semibold text-xs`}>
                                  <Clock className="h-3 w-3 mr-1" />
                                  <span>{totalHours}h</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Column 2: Teacher's Assigned Lessons */}
          <div className="col-span-3">
            <Card>
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedTeacher ? `${selectedTeacher.first_name}'s Lessons` : 'Teacher Lessons'}
                    </h2>
                    {selectedTeacher && teacherLessons.length > 0 && (
                      <button
                        onClick={handleClearAllLessons}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Clear all lessons from this teacher"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {selectedTeacher && calculateTotalHours(selectedTeacher.id) > 0 && (
                    <div className="flex items-center text-red-600 font-bold">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{calculateTotalHours(selectedTeacher.id)} hours/week</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {!selectedTeacher ? (
                  <div className="p-4 text-center text-gray-500">
                    Please select a teacher from the left panel
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {/* Show homeroom teacher assignment first */}
                    {isHomeroomTeacher(selectedTeacher.id) && (
                      <>
                        {getHomeroomClasses(selectedTeacher.id).map((cls, index) => (
                          <div key={`homeroom-${cls.id}`} className={`p-3 border-l-4 border-purple-500 ${index % 2 === 0 ? 'bg-purple-50' : 'bg-purple-50/50'}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 text-sm">Sınıf Öğretmenliği</div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {cls.name} • <span className="font-semibold">1 hour/week</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Show assigned lessons */}
                    {teacherLessons.length === 0 && !isHomeroomTeacher(selectedTeacher.id) ? (
                      <div className="p-4 text-center text-gray-500">
                        No lessons assigned yet
                      </div>
                    ) : (
                      teacherLessons.sort((a, b) => a.class_name.localeCompare(b.class_name)).map((lesson, index) => {
                        const homeroomCount = isHomeroomTeacher(selectedTeacher.id) ? getHomeroomClasses(selectedTeacher.id).length : 0;
                        const actualIndex = index + homeroomCount;
                        const hasGroups = lesson.num_groups > 1;
                        // Count total assigned groups (to any teacher)
                        const totalAssignedGroupsCount = lesson.lesson_groups.filter(
                          (g) => g.teacher_id !== null
                        ).length;

                        return (
                          <div
                            key={lesson.id}
                            className={`p-3 ${
                              hasGroups
                                ? actualIndex % 2 === 0
                                  ? 'bg-amber-50 hover:bg-amber-100'
                                  : 'bg-amber-50/50 hover:bg-amber-100'
                                : actualIndex % 2 === 0
                                ? 'bg-white hover:bg-gray-50'
                                : 'bg-slate-50 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium text-gray-900 text-sm">{lesson.subject_name}</div>
                                  {hasGroups && (
                                    <>
                                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-xs rounded font-semibold">
                                        Groups
                                      </span>
                                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-200 text-amber-900">
                                        {totalAssignedGroupsCount}/{lesson.num_groups}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {lesson.class_name} • <span className="font-semibold">{lesson.hours_per_week} hours/week</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveFromTeacher(lesson.id)}
                                className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                                title={hasGroups ? "Remove one group from teacher" : "Remove lesson from teacher"}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Column 3: Classes List */}
          <div className="col-span-3">
            <Card>
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Classes</h2>
                {selectedClass && (
                  <div className="mt-1 text-xs text-gray-600">
                    {(() => {
                      const info = getClassAssignmentInfo(selectedClass.id);
                      return (
                        <span className={info.assignedHours >= info.totalHours ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {info.assignedHours}/{info.totalHours} hours assigned
                        </span>
                      );
                    })()}
                  </div>
                )}
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
                    }).map((cls, index) => {
                      const info = getClassAssignmentInfo(cls.id);
                      return (
                        <button
                          key={cls.id}
                          onClick={() => setSelectedClass(cls)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                            selectedClass?.id === cls.id
                              ? 'bg-green-50 border-l-4 border-green-600'
                              : index % 2 === 0
                              ? 'bg-white'
                              : 'bg-slate-50'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{cls.name}</div>
                          <div className="text-sm text-gray-500">
                            Grade: {cls.grade_level || 'N/A'} • {info.assignedHours}/{info.totalHours} hrs
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Column 4: Class Lessons */}
          <div className="col-span-3">
            <Card>
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedClass ? `${selectedClass.name} - Lessons` : 'Select a Class'}
                  </h2>
                  {selectedClass && classLessons.length > 0 && (
                    <div className="text-sm font-semibold text-gray-600">
                      {(() => {
                        const assignedCount = classLessons.filter(lesson => {
                          if (lesson.num_groups > 1) {
                            // For group lessons, check if all groups have teachers
                            return lesson.lesson_groups.every(g => g.teacher_id !== null);
                          } else {
                            // For normal lessons, check if teacher is assigned
                            return lesson.teacher_id !== null;
                          }
                        }).length;
                        const totalCount = classLessons.length;
                        return (
                          <span className={assignedCount === totalCount ? 'text-green-600' : 'text-orange-600'}>
                            {assignedCount}/{totalCount} lessons assigned
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
                {selectedTeacher && (
                  <div className="mt-1 text-sm text-gray-600">
                    Selected Teacher: <span className="font-semibold">{selectedTeacher.first_name} {selectedTeacher.last_name}</span>
                  </div>
                )}
              </div>
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {!selectedClass ? (
                  <div className="p-4 text-center text-gray-500">
                    Please select a class from the middle panel
                  </div>
                ) : !selectedTeacher ? (
                  <div className="p-4 text-center text-gray-500">
                    Please select a teacher from the left panel
                  </div>
                ) : classLessons.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No lessons assigned to this class yet
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {classLessons.sort((a, b) => a.subject_name.localeCompare(b.subject_name)).map((lesson, index) => {
                      const isAssigned = isAssignedToSelectedTeacher(lesson);
                      const groupInfo = getGroupAssignmentInfo(lesson);
                      const allGroupsAssigned = groupInfo && groupInfo.assignedGroups >= groupInfo.totalGroups;
                      const hasGroups = lesson.num_groups > 1;

                      // For grouped lessons, count how many groups are assigned to selected teacher
                      const teacherGroupsCount = hasGroups
                        ? lesson.lesson_groups.filter(g => g.teacher_id === selectedTeacher?.id).length
                        : 0;

                      // Check if lesson is fully assigned (for both normal and group lessons)
                      const isFullyAssigned = hasGroups ? allGroupsAssigned : (lesson.teacher_id !== null);

                      // Determine if + button should be enabled
                      const canAssign = !isFullyAssigned;

                      // Determine if - button should be enabled
                      const canUnassign = isAssigned && !isFullyAssigned;

                      return (
                        <div
                          key={lesson.id}
                          className={`p-4 ${
                            isFullyAssigned
                              ? index % 2 === 0
                                ? 'bg-slate-100 opacity-70'
                                : 'bg-slate-200 opacity-70'
                              : hasGroups
                              ? index % 2 === 0
                                ? 'bg-amber-50 hover:bg-amber-100'
                                : 'bg-amber-100 hover:bg-amber-200'
                              : index % 2 === 0
                              ? 'bg-white hover:bg-gray-50'
                              : 'bg-slate-50 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-gray-900">
                                  {lesson.subject_name}
                                </div>
                                {groupInfo && (
                                  <>
                                    <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-xs rounded font-semibold">
                                      Groups
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-200 text-amber-900">
                                      {groupInfo.assignedGroups}/{groupInfo.totalGroups}
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                <span className="font-semibold">{lesson.hours_per_week} hrs/week</span>

                                {/* Show main teacher if not grouped */}
                                {lesson.num_groups <= 1 && lesson.teacher_name && (
                                  <div className="mt-1">
                                    <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                      {lesson.teacher_name}
                                    </span>
                                  </div>
                                )}

                                {/* Show group teachers if grouped */}
                                {lesson.num_groups > 1 && lesson.lesson_groups.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {lesson.lesson_groups.map((group) => (
                                      <span
                                        key={group.id}
                                        className={`px-2 py-0.5 rounded text-xs ${
                                          group.teacher_id
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-gray-100 text-gray-500'
                                        }`}
                                      >
                                        {group.group_name}: {group.teacher_name || 'Unassigned'}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="ml-2">
                              {isFullyAssigned ? (
                                <button
                                  disabled
                                  className="p-1 rounded text-gray-400 cursor-not-allowed"
                                  title={hasGroups ? "All groups assigned" : "Lesson assigned"}
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              ) : canUnassign ? (
                                <button
                                  onClick={() => handleUnassignTeacher(lesson.id)}
                                  className="p-1 rounded text-red-600 hover:bg-red-50"
                                  title="Unassign one group from teacher"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                              ) : canAssign ? (
                                <button
                                  onClick={() => handleAssignTeacher(lesson.id)}
                                  className="p-1 rounded text-green-600 hover:bg-green-50"
                                  title={hasGroups ? "Assign teacher to next available group" : "Assign teacher to lesson"}
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>
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

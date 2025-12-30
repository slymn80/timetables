import { useState, useEffect } from 'react';
import { Users, Save } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import SchoolFilterBanner from '../components/common/SchoolFilterBanner';
import { useAcademicYear } from '../context/AcademicYearContext';
import { lessonService, subjectService, lessonGroupService } from '../lib/services';
import type { Subject } from '../types';

interface LessonWithGroups {
  id: string;
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  teacher_id: string | null;
  teacher_name: string | null;
  hours_per_week: number;
  num_groups: number;
}

export default function LessonGroups() {
  const { selectedSchoolId } = useAcademicYear();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<LessonWithGroups[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedSchoolId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [selectedSchoolId]);

  useEffect(() => {
    if (selectedSubject) {
      loadLessonsBySubject(selectedSubject.id);
      setPendingChanges({}); // Clear pending changes when switching subjects
    }
  }, [selectedSubject]);

  const loadData = async () => {
    try {
      const [subjectsRes, lessonsRes] = await Promise.all([
        subjectService.getAll(selectedSchoolId!),
        lessonService.getAll(selectedSchoolId!),
      ]);

      // Filter to only show subjects that can be split into groups
      const groupableSubjects = (subjectsRes.subjects || []).filter(
        (s: Subject) => s.can_split_groups
      );
      setSubjects(groupableSubjects);

      if (groupableSubjects.length > 0) {
        setSelectedSubject(groupableSubjects[0]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLessonsBySubject = async (subjectId: string) => {
    try {
      const response = await lessonService.getAll(selectedSchoolId!);
      const allLessons = response.lessons || [];

      // Group lessons by class_id + subject_id
      const groupedMap = new Map<string, any>();

      allLessons
        .filter((l: any) => l.subject_id === subjectId)
        .forEach((l: any) => {
          const key = `${l.class_id}_${l.subject_id}`;
          if (!groupedMap.has(key)) {
            groupedMap.set(key, {
              id: l.id, // Use first lesson's ID as representative
              class_id: l.class_id,
              class_name: l.class_name || 'Unknown',
              subject_id: l.subject_id,
              subject_name: l.subject_name || 'Unknown',
              hours_per_week: l.hours_per_week || 0,
              num_groups: l.num_groups || 1, // Use the lesson's num_groups field
              group_lessons: [], // Array to hold all group lesson records
            });
          }
          // Add this lesson to the group
          groupedMap.get(key).group_lessons.push({
            id: l.id,
            teacher_id: l.teacher_id || null,
            teacher_name: l.teacher_name || null,
          });
        });

      setLessons(Array.from(groupedMap.values()));
    } catch (error) {
      console.error('Failed to load lessons:', error);
    }
  };

  const handleUpdateGroups = (lessonId: string, newNumGroups: number) => {
    // Grup dersi için minimum 2 grup zorunlu
    if (newNumGroups < 2) {
      alert('Grup dersi için en az 2 grup olmalıdır.');
      return;
    }

    // Find the lesson to check if groups are assigned
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) {
      console.error('Lesson not found:', lessonId);
      return;
    }

    // Count how many groups are currently assigned to teachers
    const assignedGroupsCount = lesson.group_lessons?.filter((gl: any) => gl.teacher_id !== null).length || 0;

    // Debug information
    console.log('=== Group Update Check ===');
    console.log('Lesson:', lesson.class_name, '-', lesson.subject_name);
    console.log('Current num_groups:', lesson.num_groups);
    console.log('New num_groups:', newNumGroups);
    console.log('Assigned groups count:', assignedGroupsCount);
    console.log('Group lessons:', lesson.group_lessons);
    console.log('========================');

    // Grup sayısı artırma: HER ZAMAN mümkün
    // Grup sayısı azaltma: SADECE hiçbir grup atanmamışsa mümkün
    if (newNumGroups < lesson.num_groups && assignedGroupsCount > 0) {
      alert(`Grup sayısını azaltmak için önce öğretmenlere atanan tüm grupları kaldırınız.\n\n${assignedGroupsCount} grup öğretmenlere atanmış durumda.`);
      return;
    }

    // Update pending changes
    setPendingChanges(prev => ({
      ...prev,
      [lessonId]: newNumGroups
    }));
  };

  const handleSaveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return;

    setSaving(true);
    try {
      // Get the first num_groups value to update the subject's default
      const firstNumGroups = Object.values(pendingChanges)[0];

      // Save all pending changes - update lesson num_groups and regenerate lesson groups
      for (const [lessonId, numGroups] of Object.entries(pendingChanges)) {
        // First update the lesson's num_groups field
        await lessonService.update(lessonId, { num_groups: numGroups });
        // Then regenerate the lesson_groups records
        await lessonGroupService.regenerate(lessonId);
      }

      // Update the subject's default_num_groups
      if (selectedSubject) {
        await subjectService.update(selectedSubject.id, { default_num_groups: firstNumGroups });
      }

      // Clear pending changes
      setPendingChanges({});

      // Reload data
      await loadData();

      if (selectedSubject) {
        await loadLessonsBySubject(selectedSubject.id);
      }

      alert('Changes saved successfully!');
    } catch (error: any) {
      console.error('Failed to save changes:', error);

      // Show backend error message if available
      const errorMessage = error?.response?.data?.detail || 'Failed to save changes';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getPendingOrCurrentValue = (lessonId: string, currentValue: number) => {
    return pendingChanges[lessonId] !== undefined ? pendingChanges[lessonId] : currentValue;
  };

  return (
    <div>
      <SchoolFilterBanner />

      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Lesson Groups</h1>
          <p className="text-gray-600 mt-1">
            Configure group settings for subjects that can be divided into multiple groups
          </p>
        </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : subjects.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-gray-500">
            No subjects configured for grouping. Go to Course Pool to mark subjects as groupable.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Groupable Subjects */}
          <div className="col-span-4">
            <Card>
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Groupable Subjects</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Subjects that can be divided into groups
                </p>
              </div>
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {subjects.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No groupable subjects found</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {subjects.sort((a, b) => a.name.localeCompare(b.name)).map((subject) => (
                      <button
                        key={subject.id}
                        onClick={() => setSelectedSubject(subject)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                          selectedSubject?.id === subject.id ? 'bg-amber-50 border-l-4 border-amber-600' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{subject.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {subject.short_code}
                            </div>
                          </div>
                          <div className="ml-2 flex items-center">
                            <span className="px-2 py-1 bg-amber-200 text-amber-900 text-xs rounded font-semibold">
                              {subject.default_num_groups || 1} groups
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right: Lessons with Group Configuration */}
          <div className="col-span-8">
            <Card>
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedSubject ? `${selectedSubject.name} - Group Configuration` : 'Select a Subject'}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Configure how many groups each class should have for this subject
                    </p>
                  </div>
                  {Object.keys(pendingChanges).length > 0 && (
                    <Button onClick={handleSaveChanges} disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? 'Saving...' : `Save ${Object.keys(pendingChanges).length} Change(s)`}
                    </Button>
                  )}
                </div>
              </div>
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {!selectedSubject ? (
                  <div className="p-4 text-center text-gray-500">
                    Please select a subject from the left panel
                  </div>
                ) : lessons.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No classes have been assigned this subject yet. Go to Lesson Assignments to add it to classes.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {lessons.sort((a, b) => a.class_name.localeCompare(b.class_name)).map((lesson) => {
                      const currentValue = getPendingOrCurrentValue(lesson.id, lesson.num_groups);
                      const hasChanges = pendingChanges[lesson.id] !== undefined;
                      // Count assigned groups
                      const assignedGroupsCount = lesson.group_lessons?.filter((gl: any) => gl.teacher_id !== null).length || 0;
                      // Disable decrease button if we would go below assigned count
                      const canDecrease = currentValue > 1 && currentValue > assignedGroupsCount;

                      return (
                        <div key={lesson.id} className={`p-4 ${hasChanges ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-gray-900">{lesson.class_name}</div>
                                {hasChanges && (
                                  <span className="px-2 py-0.5 bg-blue-200 text-blue-900 text-xs rounded font-semibold">
                                    Modified
                                  </span>
                                )}
                                {assignedGroupsCount > 0 && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded font-semibold">
                                    {assignedGroupsCount} assigned
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {lesson.hours_per_week} hours/week
                                {lesson.group_lessons && lesson.group_lessons.filter((gl: any) => gl.teacher_name).length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {lesson.group_lessons
                                      .filter((gl: any) => gl.teacher_name)
                                      .map((gl: any, idx: number) => (
                                        <span
                                          key={idx}
                                          className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                                        >
                                          {gl.teacher_name}
                                        </span>
                                      ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="ml-4 flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">Groups:</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleUpdateGroups(lesson.id, currentValue - 1)}
                                  disabled={!canDecrease}
                                  className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title={!canDecrease && assignedGroupsCount > 0 ? `${assignedGroupsCount} grup öğretmenlere atanmış` : ''}
                                >
                                  -
                                </button>
                                <span className="w-12 text-center font-semibold text-lg">
                                  {currentValue}
                                </span>
                                <button
                                  onClick={() => handleUpdateGroups(lesson.id, currentValue + 1)}
                                  className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100"
                                >
                                  +
                                </button>
                              </div>
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
      )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, XCircle } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import TeacherForm from '../components/common/TeacherForm';
import SchoolFilterBanner from '../components/common/SchoolFilterBanner';
import { useAcademicYear } from '../context/AcademicYearContext';
import { teacherService, lessonService, classService, roomService } from '../lib/services';
import type { Teacher, Lesson, Class, Room } from '../types';

export default function Teachers() {
  const { selectedSchoolId } = useAcademicYear();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    if (selectedSchoolId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [selectedSchoolId]);

  const loadData = async () => {
    try {
      await Promise.all([
        loadTeachers(),
        loadLessons(),
        loadClasses(),
        loadRooms()
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadTeachers = async () => {
    try {
      const response = await teacherService.getAll(selectedSchoolId!);
      setTeachers(response.teachers || []);
    } catch (error) {
      console.error('Failed to load teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLessons = async () => {
    try {
      const response = await lessonService.getAll(selectedSchoolId!);
      setLessons(response.lessons || []);
    } catch (error) {
      console.error('Failed to load lessons:', error);
    }
  };

  const loadClasses = async () => {
    try {
      const response = await classService.getAll(selectedSchoolId!);
      setClasses(response.classes || []);
    } catch (error) {
      console.error('Failed to load classes:', error);
    }
  };

  const loadRooms = async () => {
    try {
      const response = await roomService.getAll(selectedSchoolId!);
      setRooms(response.rooms || []);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  };

  const getTotalTeachingHours = (teacherId: string) => {
    // Sum up hours from all lessons
    const lessonHours = lessons.reduce((sum, lesson) => {
      // For normal lessons, check if teacher_id matches
      if (!lesson.num_groups || lesson.num_groups <= 1) {
        return lesson.teacher_id === teacherId ? sum + (lesson.hours_per_week || 0) : sum;
      }

      // For group lessons, check if teacher has any groups assigned
      const hasGroupAssignment = lesson.lesson_groups?.some((g) => g.teacher_id === teacherId);
      return hasGroupAssignment ? sum + (lesson.hours_per_week || 0) : sum;
    }, 0);

    // Check if teacher is homeroom teacher (class teacher) - adds 1 hour per homeroom class
    const homeroomHours = classes.filter(cls => cls.homeroom_teacher_id === teacherId).length;

    return lessonHours + homeroomHours;
  };

  const getHomeroomClass = (teacherId: string) => {
    return classes.find(cls => cls.homeroom_teacher_id === teacherId);
  };

  const getRehberlikClasses = (teacherId: string) => {
    // Find all Rehberlik lessons taught by this teacher
    const rehberlikLessons = lessons.filter(lesson => {
      // Check if subject name contains "Rehber" (case insensitive)
      const isRehberlik = (lesson as any).subject_name?.toLowerCase().includes('rehber');

      // Check if teacher is assigned (either directly or via lesson groups)
      if (!lesson.num_groups || lesson.num_groups <= 1) {
        return isRehberlik && lesson.teacher_id === teacherId;
      }

      // For group lessons, check if teacher has any groups assigned
      const hasGroupAssignment = lesson.lesson_groups?.some((g) => g.teacher_id === teacherId);
      return isRehberlik && hasGroupAssignment;
    });

    // Get unique class names
    const classIds = [...new Set(rehberlikLessons.map(l => l.class_id))];
    return classes.filter(cls => classIds.includes(cls.id));
  };

  const getDefaultRoom = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher || !teacher.default_room_id) return null;
    return rooms.find(room => room.id === teacher.default_room_id);
  };

  const handleAdd = () => {
    setSelectedTeacher(null);
    setIsFormOpen(true);
  };

  const handleEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsFormOpen(true);
  };

  const handleDelete = async (teacher: Teacher) => {
    const teacherName = teacher.full_name || `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || 'this teacher';
    if (window.confirm(`Are you sure you want to delete ${teacherName}?`)) {
      try {
        await teacherService.delete(teacher.id);
        loadTeachers();
      } catch (error) {
        console.error('Failed to delete teacher:', error);
        alert('Failed to delete teacher');
      }
    }
  };

  const handleClearAllPreferredFreeDays = async () => {
    // Reload to get fresh data
    await loadTeachers();

    const teachersWithUnavailableSlots = teachers.filter(t => {
      // Check if unavailable_slots exists and has at least one blocked slot
      if (!t.unavailable_slots || typeof t.unavailable_slots !== 'object') {
        return false;
      }
      // Check if any day has blocked periods
      return Object.keys(t.unavailable_slots).some(day => {
        const periods = t.unavailable_slots![day];
        return Array.isArray(periods) && periods.length > 0;
      });
    });

    if (teachersWithUnavailableSlots.length === 0) {
      alert('Hiçbir öğretmenin kapatılmış saati bulunmuyor.\n\nÖğretmen düzenleme formundan zaman dilimlerini kapatabilirsiniz.');
      return;
    }

    const confirmed = window.confirm(
      `${teachersWithUnavailableSlots.length} öğretmenin kapatılmış tüm saatleri açılacak. Devam etmek istiyor musunuz?`
    );

    if (!confirmed) return;

    try {
      // Update all teachers to clear unavailable_slots
      await Promise.all(
        teachersWithUnavailableSlots.map(teacher =>
          teacherService.update(teacher.id, { unavailable_slots: {} })
        )
      );

      await loadTeachers();
      alert(`${teachersWithUnavailableSlots.length} öğretmenin kapatılmış saatleri başarıyla açıldı.`);
    } catch (error) {
      console.error('Failed to clear unavailable slots:', error);
      alert('Kapatılmış saatleri açma işlemi başarısız oldu.');
    }
  };

  return (
    <div>
      <SchoolFilterBanner />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Teachers</h1>
        <div className="flex gap-3">
          <Button
            onClick={handleClearAllPreferredFreeDays}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Tüm Boş Saatleri Kaldır
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Teacher
          </Button>
        </div>
      </div>

      <TeacherForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={loadTeachers}
        teacher={selectedTeacher}
      />

      <Card>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No teachers found. Click "Add Teacher" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Photo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branş
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Toplam Ders Saati
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tahsis Edilmiş Oda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sınıf Öğretmeni
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
                {teachers.sort((a, b) => {
                  const aName = a.full_name || `${a.first_name || ''} ${a.last_name || ''}`.trim();
                  const bName = b.full_name || `${b.first_name || ''} ${b.last_name || ''}`.trim();
                  return aName.localeCompare(bName, 'tr');
                }).map((teacher) => {
                  const getPlaceholderAvatar = () => {
                    if (teacher.gender === 'male') {
                      return 'https://ui-avatars.com/api/?name=Male&background=4F46E5&color=fff&size=128';
                    } else if (teacher.gender === 'female') {
                      return 'https://ui-avatars.com/api/?name=Female&background=EC4899&color=fff&size=128';
                    }
                    return 'https://ui-avatars.com/api/?name=Teacher&background=6B7280&color=fff&size=128';
                  };

                  return (
                    <tr key={teacher.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <img
                          src={teacher.photo || getPlaceholderAvatar()}
                          alt={teacher.full_name || 'Teacher'}
                          className="h-10 w-10 rounded-full object-cover border-2"
                          style={{ borderColor: teacher.color_code || '#6B7280' }}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {teacher.full_name || `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim()}
                        </div>
                        {teacher.short_name && (
                          <div className="text-sm text-gray-500">{teacher.short_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(teacher as any).subject_areas && (teacher as any).subject_areas.length > 0 ? (
                            (teacher as any).subject_areas.slice(0, 3).map((subject: string, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {subject}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                          {(teacher as any).subject_areas && (teacher as any).subject_areas.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                              +{(teacher as any).subject_areas.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {getTotalTeachingHours(teacher.id) || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(() => {
                          const defaultRoom = getDefaultRoom(teacher.id);
                          return defaultRoom ? defaultRoom.name : '-';
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {(() => {
                          const homeroomClass = getHomeroomClass(teacher.id);
                          const rehberlikClasses = getRehberlikClasses(teacher.id);

                          if (!homeroomClass && rehberlikClasses.length === 0) {
                            return <span className="whitespace-nowrap">-</span>;
                          }

                          return (
                            <div className="flex flex-col gap-1">
                              {homeroomClass && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Sınıf Öğretmeni: {homeroomClass.name}
                                </span>
                              )}
                              {rehberlikClasses.map((cls) => (
                                <span key={cls.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  Rehberlik: {cls.name}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            teacher.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {teacher.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(teacher)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}

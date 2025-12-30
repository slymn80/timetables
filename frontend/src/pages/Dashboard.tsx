import { useEffect, useState } from 'react';
import { School, Users, BookOpen, Calendar, DoorOpen, Clock, GraduationCap, Layout } from 'lucide-react';
import Card from '../components/common/Card';
import SchoolFilterBanner from '../components/common/SchoolFilterBanner';
import { useAcademicYear } from '../context/AcademicYearContext';
import { teacherService, classService, subjectService, roomService, timeSlotTemplateService, timetableService, lessonService } from '../lib/services';

interface Stats {
  schools: number;
  teachers: number;
  classes: number;
  subjects: number;
  rooms: number;
  timeSlotTemplates: number;
  timetables: number;
  lessons: number;
}

export default function Dashboard() {
  const { selectedSchoolId } = useAcademicYear();
  const [stats, setStats] = useState<Stats>({
    schools: 0,
    teachers: 0,
    classes: 0,
    subjects: 0,
    rooms: 0,
    timeSlotTemplates: 0,
    timetables: 0,
    lessons: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [selectedSchoolId]);

  const fetchStats = async () => {
    try {
      const [teachersRes, classesRes, subjectsRes, roomsRes, timeSlotTemplatesRes, timetablesRes, lessonsRes] = await Promise.all([
        teacherService.getAll(selectedSchoolId!),
        classService.getAll(selectedSchoolId!),
        subjectService.getAll(selectedSchoolId!),
        roomService.getAll(selectedSchoolId!),
        timeSlotTemplateService.getAll(selectedSchoolId!),
        timetableService.getAll(selectedSchoolId!),
        lessonService.getAll(selectedSchoolId!),
      ]);

      setStats({
        schools: 1, // Current selected school
        teachers: teachersRes?.teachers?.length || 0,
        classes: classesRes?.classes?.length || 0,
        subjects: subjectsRes?.subjects?.length || 0,
        rooms: roomsRes?.rooms?.length || 0,
        timeSlotTemplates: timeSlotTemplatesRes?.templates?.length || 0,
        timetables: timetablesRes?.timetables?.length || 0,
        lessons: lessonsRes?.lessons?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { name: 'Schools', value: stats.schools, icon: School, color: 'bg-blue-500' },
    { name: 'Teachers', value: stats.teachers, icon: Users, color: 'bg-green-500' },
    { name: 'Classes', value: stats.classes, icon: BookOpen, color: 'bg-purple-500' },
    { name: 'Subjects', value: stats.subjects, icon: GraduationCap, color: 'bg-pink-500' },
    { name: 'Rooms', value: stats.rooms, icon: DoorOpen, color: 'bg-indigo-500' },
    { name: 'Time Slots', value: stats.timeSlotTemplates, icon: Clock, color: 'bg-yellow-500' },
    { name: 'Timetables', value: stats.timetables, icon: Layout, color: 'bg-teal-500' },
    { name: 'Lessons', value: stats.lessons, icon: Calendar, color: 'bg-orange-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <SchoolFilterBanner />

      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-lg ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Recent Activity">
          <p className="text-gray-500">No recent activity</p>
        </Card>
        <Card title="Quick Actions">
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-2 rounded-md hover:bg-gray-50 transition-colors">
              Create New Timetable
            </button>
            <button className="w-full text-left px-4 py-2 rounded-md hover:bg-gray-50 transition-colors">
              Add Teacher
            </button>
            <button className="w-full text-left px-4 py-2 rounded-md hover:bg-gray-50 transition-colors">
              Add Class
            </button>
          </div>
        </Card>
      </div>
      </div>
    </div>
  );
}

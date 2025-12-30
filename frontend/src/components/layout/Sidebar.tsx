import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  School,
  Users,
  BookOpen,
  DoorOpen,
  Calendar,
  Clock,
  Layout as LayoutIcon,
  ClipboardList,
  UserCheck,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Schools', href: '/schools', icon: School },
  { name: 'Academic Years', href: '/academic-years', icon: Calendar },
  { name: 'Course Pool', href: '/subjects', icon: BookOpen },
  { name: 'Teachers', href: '/teachers', icon: Users },
  { name: 'Classes', href: '/classes', icon: Calendar },
  { name: 'Rooms', href: '/rooms', icon: DoorOpen },
  { name: 'Time Slots', href: '/time-slots', icon: Clock },
  { name: 'Lesson Assignments', href: '/lessons', icon: ClipboardList },
  { name: 'Lesson Groups', href: '/lesson-groups', icon: Users },
  { name: 'Teacher Assignments', href: '/teacher-assignments', icon: UserCheck },
  { name: 'Timetables', href: '/timetables', icon: LayoutIcon },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center justify-center gap-3 border-b border-gray-800 px-4">
        <img
          src="/logo.png"
          alt="Timetable Scheduler"
          className="h-16 w-16 rounded-lg object-contain bg-white p-1 shadow-lg ring-2 ring-gray-700"
        />
        <h1 className="text-xl font-bold text-white">Timetable</h1>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

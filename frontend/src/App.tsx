import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AcademicYearProvider } from './context/AcademicYearContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Schools from './pages/Schools';
import AcademicYears from './pages/AcademicYears';
import Teachers from './pages/Teachers';
import Classes from './pages/Classes';
import Subjects from './pages/Subjects';
import Rooms from './pages/Rooms';
import TimeSlots from './pages/TimeSlots';
import TimeSlotDetail from './pages/TimeSlotDetail';
import Lessons from './pages/Lessons';
import LessonGroups from './pages/LessonGroups';
import TeacherAssignments from './pages/TeacherAssignments';
import Timetables from './pages/Timetables';
import TimetableView from './pages/TimetableView';

function App() {
  return (
    <AcademicYearProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="schools" element={<Schools />} />
            <Route path="academic-years" element={<AcademicYears />} />
            <Route path="teachers" element={<Teachers />} />
            <Route path="classes" element={<Classes />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="time-slots" element={<TimeSlots />} />
            <Route path="time-slots/:id" element={<TimeSlotDetail />} />
            <Route path="lessons" element={<Lessons />} />
            <Route path="lesson-groups" element={<LessonGroups />} />
            <Route path="teacher-assignments" element={<TeacherAssignments />} />
            <Route path="timetables" element={<Timetables />} />
            <Route path="timetables/:id" element={<TimetableView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AcademicYearProvider>
  );
}

export default App;

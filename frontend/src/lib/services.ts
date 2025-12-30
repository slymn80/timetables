import api from './api';
import type {
  School,
  Teacher,
  Class,
  Subject,
  Room,
  TimeSlot,
  Lesson,
  Timetable,
  AcademicYear,
} from '../types';

// Schools
export const schoolService = {
  getAll: () => api.get<School[]>('/schools/'),
  getById: (id: string) => api.get<School>(`/schools/${id}`),
  create: (data: Partial<School>) => api.post<School>('/schools/', data),
  update: (id: string, data: Partial<School>) =>
    api.put<School>(`/schools/${id}`, data),
  delete: (id: string) => api.delete(`/schools/${id}`),
};

// Teachers
export const teacherService = {
  getAll: (schoolId?: string) =>
    api.get<Teacher[]>('/teachers/', { params: { school_id: schoolId } }),
  getById: (id: string) => api.get<Teacher>(`/teachers/${id}`),
  create: (data: Partial<Teacher>) => api.post<Teacher>('/teachers/', data),
  update: (id: string, data: Partial<Teacher>) =>
    api.put<Teacher>(`/teachers/${id}`, data),
  delete: (id: string) => api.delete(`/teachers/${id}`),
};

// Classes
export const classService = {
  getAll: (schoolId?: string) =>
    api.get<Class[]>('/classes/', { params: { school_id: schoolId } }),
  getById: (id: string) => api.get<Class>(`/classes/${id}`),
  create: (data: Partial<Class>) => api.post<Class>('/classes/', data),
  update: (id: string, data: Partial<Class>) =>
    api.put<Class>(`/classes/${id}`, data),
  delete: (id: string) => api.delete(`/classes/${id}`),
};

// Subjects
export const subjectService = {
  getAll: (schoolId?: string) =>
    api.get<Subject[]>('/subjects/', { params: { school_id: schoolId } }),
  getById: (id: string) => api.get<Subject>(`/subjects/${id}`),
  create: (data: Partial<Subject>) => api.post<Subject>('/subjects/', data),
  update: (id: string, data: Partial<Subject>) =>
    api.put<Subject>(`/subjects/${id}`, data),
  delete: (id: string) => api.delete(`/subjects/${id}`),
};

// Rooms
export const roomService = {
  getAll: (schoolId?: string) =>
    api.get<Room[]>('/rooms/', { params: { school_id: schoolId } }),
  getById: (id: string) => api.get<Room>(`/rooms/${id}`),
  create: (data: Partial<Room>) => api.post<Room>('/rooms/', data),
  update: (id: string, data: Partial<Room>) =>
    api.put<Room>(`/rooms/${id}`, data),
  delete: (id: string) => api.delete(`/rooms/${id}`),
};

// Time Slot Templates
export const timeSlotTemplateService = {
  getAll: (schoolId?: string) =>
    api.get('/time-slot-templates/', { params: { school_id: schoolId } }),
  getById: (id: string) => api.get(`/time-slot-templates/${id}`),
  create: (data: { school_id: string; name: string; description?: string }) =>
    api.post('/time-slot-templates/', null, { params: data }),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.put(`/time-slot-templates/${id}`, null, { params: data }),
  delete: (id: string) => api.delete(`/time-slot-templates/${id}`),
};

// Time Slots
export const timeSlotService = {
  getAll: (templateId?: string) =>
    api.get<TimeSlot[]>('/time-slots/', { params: { template_id: templateId } }),
  getById: (id: string) => api.get<TimeSlot>(`/time-slots/${id}`),
  create: (data: Partial<TimeSlot>) => api.post<TimeSlot>('/time-slots/', data),
  update: (id: string, data: Partial<TimeSlot>) =>
    api.put<TimeSlot>(`/time-slots/${id}`, data),
  delete: (id: string) => api.delete(`/time-slots/${id}`),
};

// Lessons
export const lessonService = {
  getAll: (schoolId?: string) =>
    api.get<Lesson[]>('/lessons/', { params: { school_id: schoolId } }),
  getById: (id: string) => api.get<Lesson>(`/lessons/${id}`),
  create: (data: Partial<Lesson>) => api.post<Lesson>('/lessons/', data),
  update: (id: string, data: Partial<Lesson>) =>
    api.put<Lesson>(`/lessons/${id}`, data),
  delete: (id: string) => api.delete(`/lessons/${id}`),
  splitIntoGroups: (id: string, numGroups: number) =>
    api.post(`/lessons/${id}/split-groups?num_groups=${numGroups}`),
};

// Timetables
export const timetableService = {
  getAll: (schoolId?: string) =>
    api.get<Timetable[]>('/timetables/', { params: { school_id: schoolId } }),
  getById: (id: string) => api.get<Timetable>(`/timetables/${id}`),
  getEntries: (id: string) => api.get(`/timetables/${id}/entries`),
  getStatistics: (id: string) => api.get(`/timetables/${id}/statistics`),
  create: (data: Partial<Timetable>) => api.post<Timetable>('/timetables/', data),
  update: (id: string, data: Partial<Timetable>) =>
    api.put<Timetable>(`/timetables/${id}`, data),
  delete: (id: string) => api.delete(`/timetables/${id}`),
  generate: (id: string) => api.post(`/timetables/${id}/generate`),
};

// Academic Years
export const academicYearService = {
  getAll: (schoolId?: string) =>
    api.get<AcademicYear[]>('/academic-years/', { params: { school_id: schoolId } }),
  getById: (id: string) => api.get<AcademicYear>(`/academic-years/${id}`),
  create: (data: Partial<AcademicYear>) => api.post<AcademicYear>('/academic-years/', data),
  update: (id: string, data: Partial<AcademicYear>) =>
    api.put<AcademicYear>(`/academic-years/${id}`, data),
  delete: (id: string) => api.delete(`/academic-years/${id}`),
};

// Lesson Groups
export const lessonGroupService = {
  getByLesson: (lessonId: string) => api.get(`/lesson-groups/lesson/${lessonId}`),
  update: (groupId: string, data: any) => api.put(`/lesson-groups/${groupId}`, data),
  assignTeacher: (groupId: string, teacherId: string) =>
    api.put(`/lesson-groups/${groupId}`, { teacher_id: teacherId }),
  regenerate: (lessonId: string) => api.post(`/lesson-groups/lesson/${lessonId}/regenerate`),
};

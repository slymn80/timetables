export interface School {
  id: string;
  name: string;
  short_name?: string;
  principal_name?: string;
  deputy_principal_name?: string;
  school_type?: string;
  education_type?: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  school_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  short_name?: string;
  email?: string;
  phone?: string;
  id_number?: string;
  gender?: string;
  photo?: string;
  is_available_for_duty?: boolean;
  teaching_languages?: string[];
  subject_areas?: string[];
  is_pregnant?: boolean;
  has_diabetes?: boolean;
  has_gluten_intolerance?: boolean;
  other_health_conditions?: string;
  max_hours_per_day?: number;
  max_hours_per_week?: number;
  min_hours_per_week?: number;
  max_consecutive_hours?: number;
  preferred_free_day?: string;
  color_code?: string;
  unavailable_slots?: Record<string, number[]>;
  default_room_id?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Class {
  id: string;
  school_id: string;
  name: string;
  short_name?: string;
  grade_level?: number;
  language?: string;
  student_count?: number;
  max_hours_per_day?: number;
  homeroom_teacher_id?: string;
  color_code?: string;
  unavailable_slots?: Record<string, number[]>;
  default_room_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  short_code: string;
  description?: string;

  // Course configuration
  grade_level?: string;
  default_weekly_hours?: number;
  default_distribution_format?: string;
  is_mandatory?: boolean;
  delivery_mode?: string;
  can_split_groups?: boolean;
  default_num_groups?: number;

  // Display and requirements
  color_code?: string;
  requires_room_type?: string;
  requires_consecutive_periods?: boolean;
  default_allow_consecutive?: boolean;
  preferred_time_of_day?: string;
  difficulty_level?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  school_id: string;
  name: string;
  short_name?: string;
  room_type: string;
  capacity?: number;
  floor?: number;
  area_sqm?: number;
  desk_count?: number;
  has_smartboard?: boolean;
  building?: string;
  equipment?: string[];
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  id: string;
  school_id: string;
  template_id?: string;
  day: string;
  period_number: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
  label?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeSlotTemplate {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  time_slots?: TimeSlot[];
}

export interface LessonGroup {
  id: string;
  lesson_id: string;
  group_name: string;
  teacher_id?: string;
  room_id?: string;
}

export interface Lesson {
  id: string;
  school_id: string;
  class_id: string;
  class_name?: string;
  subject_id: string;
  subject_name?: string;
  teacher_id?: string;
  teacher_name?: string;
  hours_per_week: number;
  can_split?: boolean;
  num_groups?: number;
  lesson_groups?: LessonGroup[];
  requires_double_period?: boolean;
  max_hours_per_day?: number;  // Maximum hours this lesson can be scheduled on the same day
  allow_consecutive?: boolean;  // Allow lessons to be scheduled consecutively (back-to-back)
  preferred_room_id?: string;
  extra_metadata?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Violation {
  id: string;
  constraint_type: string;
  severity: string;
  description: string;
  affected_entities: any;
  created_at: string;
}

export interface Timetable {
  id: string;
  school_id: string;
  name: string;
  academic_year?: string;
  semester?: string;
  algorithm: string;
  status: string;
  generation_started_at?: string;
  generation_completed_at?: string;
  generation_duration_seconds?: number;
  hard_constraint_violations?: number;
  soft_constraint_score?: number;
  violations?: Violation[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimetableEntry {
  id: string;
  timetable_id: string;
  time_slot_id: string;
  lesson_id: string;
  lesson_group_id?: string;
  room_id?: string;
  is_locked?: boolean;
  notes?: string;
}

// Re-export AcademicYear from context to avoid circular dependencies
export type { AcademicYear } from '../context/AcademicYearContext';

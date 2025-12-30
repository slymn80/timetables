import React, { useEffect } from 'react';
import { useAcademicYear } from '../../context/AcademicYearContext';

// Local type definition to avoid import issues
interface AcademicYear {
  id: string;
  school_id: string;
  name: string;
  start_date: string;
  end_date: string;
  description?: string;
  calendar_file?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const AcademicYearSelector: React.FC = () => {
  const {
    selectedAcademicYear,
    setSelectedAcademicYear,
    academicYears,
    setAcademicYears,
    selectedSchoolId,
  } = useAcademicYear();

  useEffect(() => {
    fetchAcademicYears();
  }, [selectedSchoolId]);

  const fetchAcademicYears = async () => {
    try {
      const url = selectedSchoolId
        ? `${API_BASE_URL}/api/v1/academic-years?school_id=${selectedSchoolId}`
        : `${API_BASE_URL}/api/v1/academic-years`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch academic years');
      const data = await response.json();
      setAcademicYears(data.academic_years || []);

      // Auto-select the first active year if none is selected
      if (!selectedAcademicYear && data.academic_years.length > 0) {
        const activeYear = data.academic_years.find((y: AcademicYear) => y.is_active);
        if (activeYear) {
          setSelectedAcademicYear(activeYear);
        } else if (data.academic_years.length > 0) {
          setSelectedAcademicYear(data.academic_years[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const yearId = e.target.value;
    if (!yearId) {
      setSelectedAcademicYear(null);
      return;
    }

    const year = academicYears.find((y) => y.id === yearId);
    if (year) {
      setSelectedAcademicYear(year);
    }
  };

  if (academicYears.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="academic-year-selector" className="text-sm font-medium text-gray-700">
        Academic Year:
      </label>
      <select
        id="academic-year-selector"
        value={selectedAcademicYear?.id || ''}
        onChange={handleYearChange}
        className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      >
        <option value="">All Years</option>
        {academicYears.map((year) => (
          <option key={year.id} value={year.id}>
            {year.name} {year.is_active ? '(Active)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
};

export default AcademicYearSelector;

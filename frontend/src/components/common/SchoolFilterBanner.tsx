import { useState, useEffect } from 'react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { schoolService } from '../../lib/services';
import type { School } from '../../types';

export default function SchoolFilterBanner() {
  const {
    selectedSchoolId,
    setSelectedSchoolId,
    selectedAcademicYear,
    setSelectedAcademicYear,
    academicYears,
  } = useAcademicYear();

  const [schools, setSchools] = useState<School[]>([]);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    if (selectedSchoolId && schools.length > 0) {
      const school = schools.find(s => s.id === selectedSchoolId);
      setCurrentSchool(school || null);
    }
  }, [selectedSchoolId, schools]);

  const loadSchools = async () => {
    try {
      const response = await schoolService.getAll();
      const schoolsList = Array.isArray(response) ? response : (response.schools || []);
      setSchools(schoolsList);

      // Auto-select first active school if none selected
      if (!selectedSchoolId && schoolsList.length > 0) {
        const activeSchool = schoolsList.find(s => s.is_active);
        const schoolToSelect = activeSchool || schoolsList[0];
        setCurrentSchool(schoolToSelect);
        setSelectedSchoolId(schoolToSelect.id);
      }
    } catch (error) {
      console.error('Error loading schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const schoolId = e.target.value;
    if (!schoolId) {
      setCurrentSchool(null);
      setSelectedSchoolId(null);
      return;
    }

    const school = schools.find(s => s.id === schoolId);
    if (school) {
      setCurrentSchool(school);
      setSelectedSchoolId(school.id);
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const yearId = e.target.value;
    if (!yearId) {
      setSelectedAcademicYear(null);
      return;
    }

    const year = academicYears.find(y => y.id === yearId);
    if (year) {
      setSelectedAcademicYear(year);
    }
  };

  if (loading) {
    return (
      <div className="sticky top-0 z-40 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-indigo-200 shadow-sm">
        <div className="px-6 py-3">
          <div className="text-sm text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-indigo-200 shadow-sm">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: School Info */}
          <div className="flex items-center gap-3">
            {currentSchool?.logo && (
              <img
                src={currentSchool.logo}
                alt={currentSchool.name}
                className="h-10 w-10 rounded-lg object-contain bg-white p-1 shadow"
              />
            )}
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {currentSchool?.name || 'No School Selected'}
              </div>
              {selectedAcademicYear && (
                <div className="text-xs text-gray-600 flex items-center gap-2">
                  <span>{selectedAcademicYear.name}</span>
                  {selectedAcademicYear.is_active && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Selectors */}
          <div className="flex items-center gap-4">
            {/* School Selector */}
            {schools.length > 1 && (
              <div className="flex items-center gap-2">
                <label htmlFor="school-filter" className="text-sm font-medium text-gray-700">
                  School:
                </label>
                <select
                  id="school-filter"
                  value={currentSchool?.id || ''}
                  onChange={handleSchoolChange}
                  className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Academic Year Selector */}
            {academicYears.length > 0 && (
              <div className="flex items-center gap-2">
                <label htmlFor="year-filter" className="text-sm font-medium text-gray-700">
                  Academic Year:
                </label>
                <select
                  id="year-filter"
                  value={selectedAcademicYear?.id || ''}
                  onChange={handleYearChange}
                  className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {academicYears.map(year => (
                    <option key={year.id} value={year.id}>
                      {year.name} {year.is_active ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

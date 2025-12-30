import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { academicYearService } from '../lib/services';

// AcademicYear type definition
export interface AcademicYear {
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

interface AcademicYearContextType {
  selectedAcademicYear: AcademicYear | null;
  setSelectedAcademicYear: (year: AcademicYear | null) => void;
  academicYears: AcademicYear[];
  setAcademicYears: (years: AcademicYear[]) => void;
  selectedSchoolId: string | null;
  setSelectedSchoolId: (id: string | null) => void;
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

export const useAcademicYear = () => {
  const context = useContext(AcademicYearContext);
  if (!context) {
    throw new Error('useAcademicYear must be used within AcademicYearProvider');
  }
  return context;
};

interface AcademicYearProviderProps {
  children: ReactNode;
}

export const AcademicYearProvider: React.FC<AcademicYearProviderProps> = ({ children }) => {
  const [selectedAcademicYear, setSelectedAcademicYearState] = useState<AcademicYear | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedSchoolId, setSelectedSchoolIdState] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedYearId = localStorage.getItem('selectedAcademicYearId');
    const savedSchoolId = localStorage.getItem('selectedSchoolId');

    if (savedSchoolId) {
      setSelectedSchoolIdState(savedSchoolId);
    }

    if (savedYearId && academicYears.length > 0) {
      const year = academicYears.find(y => y.id === savedYearId);
      if (year) {
        setSelectedAcademicYearState(year);
      }
    }
  }, [academicYears]);

  // Auto-fetch and select academic year when school changes
  useEffect(() => {
    if (selectedSchoolId) {
      fetchAndAutoSelectAcademicYear(selectedSchoolId);
    } else {
      setAcademicYears([]);
      setSelectedAcademicYearState(null);
    }
  }, [selectedSchoolId]);

  const fetchAndAutoSelectAcademicYear = async (schoolId: string) => {
    try {
      const response = await academicYearService.getAll(schoolId);
      const years = response.academic_years || [];

      setAcademicYears(years);

      // Auto-select active year, fallback to first year
      const activeYear = years.find(y => y.is_active);
      const yearToSelect = activeYear || years[0] || null;

      if (yearToSelect) {
        setSelectedAcademicYearState(yearToSelect);
        localStorage.setItem('selectedAcademicYearId', yearToSelect.id);
      } else {
        setSelectedAcademicYearState(null);
        localStorage.removeItem('selectedAcademicYearId');
      }
    } catch (error) {
      console.error('Failed to fetch academic years:', error);
      setAcademicYears([]);
    }
  };

  const setSelectedAcademicYear = (year: AcademicYear | null) => {
    setSelectedAcademicYearState(year);
    if (year) {
      localStorage.setItem('selectedAcademicYearId', year.id);
    } else {
      localStorage.removeItem('selectedAcademicYearId');
    }
  };

  const setSelectedSchoolId = (id: string | null) => {
    setSelectedSchoolIdState(id);
    if (id) {
      localStorage.setItem('selectedSchoolId', id);
    } else {
      localStorage.removeItem('selectedSchoolId');
    }
  };

  return (
    <AcademicYearContext.Provider
      value={{
        selectedAcademicYear,
        setSelectedAcademicYear,
        academicYears,
        setAcademicYears,
        selectedSchoolId,
        setSelectedSchoolId,
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
};

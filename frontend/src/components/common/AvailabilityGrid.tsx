import { useState } from 'react';

interface AvailabilityGridProps {
  value: Record<string, number[]>; // {"1": [1,2,3], "2": [4,5]} - day: [periods]
  onChange: (value: Record<string, number[]>) => void;
  maxPeriods?: number;
  workingDays?: number[]; // [1,2,3,4,5] = Mon-Fri
}

export default function AvailabilityGrid({
  value,
  onChange,
  maxPeriods = 8,  // UI'da gösterilecek slot sayısı (1 slot = 1 saat)
  workingDays = [1, 2, 3, 4, 5],
}: AvailabilityGridProps) {
  const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const periods = Array.from({ length: maxPeriods }, (_, i) => i + 1);

  // Dinamik hücre boyutu - period sayısına göre
  const getCellHeight = () => {
    if (maxPeriods <= 6) return 'h-12'; // Büyük hücreler
    if (maxPeriods <= 8) return 'h-10'; // Orta hücreler
    if (maxPeriods <= 10) return 'h-8'; // Küçük hücreler
    return 'h-6'; // Çok küçük hücreler
  };

  const cellHeight = getCellHeight();

  const toggleSlot = (day: number, period: number) => {
    const dayKey = String(day);
    const currentPeriods = value[dayKey] || [];

    let newPeriods: number[];
    if (currentPeriods.includes(period)) {
      // Remove period
      newPeriods = currentPeriods.filter(p => p !== period);
    } else {
      // Add period
      newPeriods = [...currentPeriods, period].sort((a, b) => a - b);
    }

    const newValue = { ...value };
    if (newPeriods.length === 0) {
      delete newValue[dayKey];
    } else {
      newValue[dayKey] = newPeriods;
    }

    onChange(newValue);
  };

  const isUnavailable = (day: number, period: number) => {
    const dayKey = String(day);
    return (value[dayKey] || []).includes(period);
  };

  const clearDay = (day: number) => {
    const newValue = { ...value };
    delete newValue[String(day)];
    onChange(newValue);
  };

  const closeAllDay = (day: number) => {
    const dayKey = String(day);
    // Close ALL periods (1-45) to cover all possible lesson slots
    // Different classes may have lessons at different period numbers
    // This ensures the entire day is blocked for the teacher
    const allPeriods = Array.from({ length: 45 }, (_, i) => i + 1);
    const newValue = { ...value };
    newValue[dayKey] = allPeriods;
    onChange(newValue);
  };

  const openAllDay = (day: number) => {
    const newValue = { ...value };
    delete newValue[String(day)];
    onChange(newValue);
  };

  const clearAll = () => {
    onChange({});
  };

  const getUnavailableCount = () => {
    return Object.values(value).reduce((sum, periods) => sum + periods.length, 0);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          <span className="font-medium">Müsait Olmayan Saatler</span>
          {getUnavailableCount() > 0 && (
            <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
              {getUnavailableCount()} saat kapalı
            </span>
          )}
        </div>
        {getUnavailableCount() > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-red-600 hover:text-red-800 underline"
          >
            Tümünü Temizle
          </button>
        )}
      </div>

      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Gün
                </th>
                {periods.map((period) => (
                  <th
                    key={period}
                    className="px-2 py-2 text-center text-xs font-medium text-gray-500"
                  >
                    {period}
                  </th>
                ))}
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workingDays.map((day) => (
                <tr key={day} className="hover:bg-gray-50">
                  <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-700">
                    {dayNames[day - 1]}
                  </td>
                  {periods.map((period) => {
                    const unavailable = isUnavailable(day, period);
                    return (
                      <td key={period} className="px-1 py-1">
                        <button
                          type="button"
                          onClick={() => toggleSlot(day, period)}
                          className={`w-full ${cellHeight} rounded transition-all ${
                            unavailable
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300'
                          }`}
                          title={unavailable ? 'Kapalı - Aç' : 'Açık - Kapat'}
                        >
                          {unavailable ? '✕' : '✓'}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => closeAllDay(day)}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                        title="Günü tamamen kapat"
                      >
                        Kapat
                      </button>
                      <button
                        type="button"
                        onClick={() => openAllDay(day)}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors"
                        title="Günü tamamen aç"
                      >
                        Aç
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-gray-500 flex items-start gap-4">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span>Müsait</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Müsait Değil</span>
        </div>
        <div className="flex-1 text-right italic">
          Tıklayarak saatleri kapatabilir/açabilirsiniz
        </div>
      </div>
    </div>
  );
}

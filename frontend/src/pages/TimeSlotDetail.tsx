import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Copy, ArrowLeft, CopyPlus } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import { timeSlotService, timeSlotTemplateService, schoolService } from '../lib/services';
import type { TimeSlot, School } from '../types';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES: { [key: string]: string } = {
  monday: 'Pazartesi',
  tuesday: 'Salı',
  wednesday: 'Çarşamba',
  thursday: 'Perşembe',
  friday: 'Cuma',
  saturday: 'Cumartesi',
  sunday: 'Pazar',
};

export default function TimeSlotDetail() {
  const { id: templateId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourceDay, setCopySourceDay] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateDay, setDuplicateDay] = useState<string>('');
  const [duplicateCount, setDuplicateCount] = useState(1);
  const [formData, setFormData] = useState({
    school_id: '',
    template_id: templateId || '',
    day: 'monday',
    period_number: 1,
    start_time: '08:00',
    end_time: '08:45',
    is_break: false,
    label: '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    if (!templateId) {
      console.error('No template ID provided');
      setLoading(false);
      return;
    }

    try {
      const [templateRes, timeSlotsRes, schoolsRes] = await Promise.all([
        timeSlotTemplateService.getById(templateId),
        timeSlotService.getAll(templateId),
        schoolService.getAll(),
      ]);

      setTemplateName(templateRes.name || '');
      setTimeSlots(timeSlotsRes.time_slots || []);

      const schoolsList = Array.isArray(schoolsRes) ? schoolsRes : (schoolsRes.schools || []);
      setSchools(schoolsList);

      if (schoolsList.length > 0) {
        setFormData(prev => ({
          ...prev,
          school_id: schoolsList[0].id,
          template_id: templateId,
        }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeSlots = async () => {
    if (!templateId) return;

    try {
      const response = await timeSlotService.getAll(templateId);
      setTimeSlots(response.time_slots || []);
    } catch (error) {
      console.error('Failed to load time slots:', error);
    }
  };

  const handleEdit = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setFormData({
      school_id: slot.school_id,
      template_id: templateId || '',
      day: slot.day,
      period_number: slot.period_number,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_break: slot.is_break || false,
      label: slot.label || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (slotId: string) => {
    try {
      await timeSlotService.delete(slotId);
      await loadTimeSlots();
    } catch (error) {
      console.error('Failed to delete time slot:', error);
      alert('Failed to delete time slot');
    }
  };


  const handleDeleteDay = async (day: string) => {
    const confirmed = window.confirm(
      `${DAY_NAMES[day]} gününün tüm time slot'larını silmek istediğinize emin misiniz?`
    );
    
    if (!confirmed) return;

    try {
      // Get day slots
      const daySlots = timeSlots.filter(
        (slot) => slot.day.toLowerCase() === day.toLowerCase()
      );

      // Delete all slots for this day
      for (const slot of daySlots) {
        await timeSlotService.delete(slot.id);
      }

      await loadTimeSlots();
      alert(`${DAY_NAMES[day]} günü başarıyla silindi.`);
    } catch (error) {
      console.error('Failed to delete day:', error);
      alert('Gün silme işlemi başarısız oldu.');
    }
  };

  const handleOpenCopyModal = (sourceDay: string) => {
    const sourceDaySlots = timeSlots.filter(
      (slot) => slot.day.toLowerCase() === sourceDay.toLowerCase()
    );

    if (sourceDaySlots.length === 0) {
      alert('Bu günde kopyalanacak time slot bulunamadı.');
      return;
    }

    setCopySourceDay(sourceDay);
    setSelectedDays([]);
    setIsCopyModalOpen(true);
  };

  const handleCopyToSelectedDays = async () => {
    if (selectedDays.length === 0) {
      alert('Lütfen en az bir gün seçin.');
      return;
    }

    try {
      // Get source day slots
      const sourceDaySlots = timeSlots.filter(
        (slot) => slot.day.toLowerCase() === copySourceDay.toLowerCase()
      );

      let createdCount = 0;

      for (const targetDay of selectedDays) {
        // First, delete existing slots for target day
        const existingSlots = timeSlots.filter(
          (slot) => slot.day.toLowerCase() === targetDay.toLowerCase()
        );

        for (const slot of existingSlots) {
          await timeSlotService.delete(slot.id);
        }

        // Then create new slots from source
        for (const sourceSlot of sourceDaySlots) {
          await timeSlotService.create({
            school_id: sourceSlot.school_id,
            template_id: templateId,
            day: targetDay,
            period_number: sourceSlot.period_number,
            start_time: sourceSlot.start_time,
            end_time: sourceSlot.end_time,
            is_break: sourceSlot.is_break || false,
            label: sourceSlot.label || '',
          });
          createdCount++;
        }
      }

      await loadTimeSlots();
      setIsCopyModalOpen(false);
      setCopySourceDay('');
      setSelectedDays([]);
      alert(`Başarıyla ${createdCount} time slot kopyalandı.`);
    } catch (error) {
      console.error('Failed to copy slots:', error);
      alert('Time slot kopyalama başarısız oldu.');
    }
  };

  const handleToggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleOpenDuplicateModal = (day: string) => {
    const daySlots = timeSlots.filter(
      (slot) => slot.day.toLowerCase() === day.toLowerCase()
    );

    if (daySlots.length === 0) {
      alert('Bu günde çoğaltılacak time slot bulunamadı.');
      return;
    }

    setDuplicateDay(day);
    setDuplicateCount(1);
    setIsDuplicateModalOpen(true);
  };

  const handleDuplicateSlots = async () => {
    if (duplicateCount < 1) {
      alert('Çoğaltma sayısı en az 1 olmalıdır.');
      return;
    }

    try {
      // Get the slots for the selected day, sorted by time
      const daySlots = timeSlots
        .filter((slot) => slot.day.toLowerCase() === duplicateDay.toLowerCase())
        .sort((a, b) => {
          const aTime = a.start_time.split(':').map(Number);
          const bTime = b.start_time.split(':').map(Number);
          return aTime[0] * 60 + aTime[1] - (bTime[0] * 60 + bTime[1]);
        });

      if (daySlots.length === 0) return;

      // Calculate the total duration of one cycle (all slots together)
      const firstSlotStart = daySlots[0].start_time;
      const lastSlotEnd = daySlots[daySlots.length - 1].end_time;

      const cycleDurationMinutes = calculateTimeDifferenceMinutes(firstSlotStart, lastSlotEnd);

      // Get the highest period number currently in use for this day
      const maxPeriodNumber = Math.max(...daySlots.map(slot => slot.period_number));

      let createdCount = 0;

      // Create duplicates
      for (let i = 1; i <= duplicateCount; i++) {
        for (let j = 0; j < daySlots.length; j++) {
          const originalSlot = daySlots[j];

          // Calculate the time offset for this duplicate
          const offsetMinutes = i * cycleDurationMinutes;

          // Calculate individual slot duration
          const slotDurationMinutes = calculateTimeDifferenceMinutes(
            originalSlot.start_time,
            originalSlot.end_time
          );

          // Calculate the offset from the first slot's start to this slot's start
          const slotOffsetMinutes = calculateTimeDifferenceMinutes(
            firstSlotStart,
            originalSlot.start_time
          );

          // Calculate new start time
          const newStartTime = addMinutesToTime(firstSlotStart, offsetMinutes + slotOffsetMinutes);
          const newEndTime = addMinutesToTime(newStartTime, slotDurationMinutes);

          // Increment the label number if it contains a number
          const newLabel = incrementLabelNumber(originalSlot.label || '', i);

          await timeSlotService.create({
            school_id: originalSlot.school_id,
            template_id: templateId,
            day: duplicateDay,
            period_number: maxPeriodNumber + (i * daySlots.length) + j + 1,
            start_time: newStartTime,
            end_time: newEndTime,
            is_break: originalSlot.is_break || false,
            label: newLabel,
          });
          createdCount++;
        }
      }

      await loadTimeSlots();
      setIsDuplicateModalOpen(false);
      setDuplicateDay('');
      setDuplicateCount(1);
      alert(`Başarıyla ${createdCount} time slot çoğaltıldı.`);
    } catch (error) {
      console.error('Failed to duplicate slots:', error);
      alert('Time slot çoğaltma başarısız oldu.');
    }
  };

  // Helper function to calculate time difference in minutes
  const calculateTimeDifferenceMinutes = (startTime: string, endTime: string): number => {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    return endTotalMinutes - startTotalMinutes;
  };

  // Helper function to add minutes to a time string
  const addMinutesToTime = (time: string, minutesToAdd: number): string => {
    const [hours, minutes] = time.split(':').map(Number);

    const totalMinutes = hours * 60 + minutes + minutesToAdd;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;

    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  };

  // Helper function to increment number in label
  // e.g., "1. Ders" -> "2. Ders", "1. Ara" -> "2. Ara"
  const incrementLabelNumber = (label: string, incrementBy: number): string => {
    if (!label) return label;

    // Match any number in the label (e.g., "1" in "1. Ders" or "1. Ara")
    const match = label.match(/(\d+)/);

    if (match) {
      const originalNumber = parseInt(match[1], 10);
      const newNumber = originalNumber + incrementBy;

      // Replace the first number with the incremented value
      return label.replace(/\d+/, String(newNumber));
    }

    // If no number found, return the original label
    return label;
  };

  const handleSubmit = async () => {
    try {
      if (editingSlot) {
        await timeSlotService.update(editingSlot.id, formData);
      } else {
        await timeSlotService.create(formData);
      }

      await loadTimeSlots();
      setIsModalOpen(false);
      setEditingSlot(null);
      setFormData({
        school_id: schools[0]?.id || '',
        template_id: templateId || '',
        day: 'monday',
        period_number: 1,
        start_time: '08:00',
        end_time: '08:45',
        is_break: false,
        label: '',
      });
    } catch (error) {
      console.error('Failed to save time slot:', error);
      alert('Failed to save time slot');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSlot(null);
    setFormData({
      school_id: schools[0]?.id || '',
        template_id: templateId || '',
        day: 'monday',
      period_number: 1,
      start_time: '08:00',
      end_time: '08:45',
      is_break: false,
      label: '',
    });
  };

  // Group time slots by day
  const groupedSlots = DAYS.map((day) => ({
    day,
    slots: timeSlots
      .filter((slot) => slot.day.toLowerCase() === day.toLowerCase())
      .sort((a, b) => a.period_number - b.period_number),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            onClick={() => navigate('/time-slots')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {templateName || 'Time Slots'}
          </h1>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Time Slot
        </Button>
      </div>

      {loading ? (
        <Card>
          <div className="text-center py-8 text-gray-500">Loading...</div>
        </Card>
      ) : timeSlots.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-gray-500">
            No time slots found. Click "Add Time Slot" to create one.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {groupedSlots.map(({ day, slots }) => (
            <Card key={day}>
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                <h3 className="font-bold text-lg text-gray-900">{DAY_NAMES[day]}</h3>
                <div className="flex gap-1">
                  {slots.length > 0 && (
                    <>
                      <button
                        onClick={() => handleDeleteDay(day)}
                        className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                        title="Günü Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDuplicateModal(day)}
                        className="p-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded transition-colors"
                        title="Gün İçinde Çoğalt"
                      >
                        <CopyPlus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenCopyModal(day)}
                        className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors"
                        title="Tüm Haftaya Kopyala"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {slots.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No slots for this day</p>
              ) : (
                <div className="space-y-2">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`p-3 rounded-md border ${
                        slot.is_break
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">
                          {slot.label || (slot.is_break ? 'Break' : `Period ${slot.period_number}`)}
                        </span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEdit(slot)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Edit"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(slot.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        {slot.start_time} - {slot.end_time}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Time Slot Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSlot ? 'Edit Time Slot' : 'Add New Time Slot'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              School <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.school_id}
              onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={!!editingSlot}
            >
              <option value="">Select a school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Day <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {DAY_NAMES[day]}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Period Number"
              type="number"
              min="1"
              value={formData.period_number}
              onChange={(e) => setFormData({ ...formData, period_number: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              required
            />

            <Input
              label="End Time"
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              required
            />
          </div>

          <Input
            label="Label (Optional)"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            placeholder="e.g., 1. Ders, Öğle Arası"
          />

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_break}
                onChange={(e) => setFormData({ ...formData, is_break: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                This is a break period (lunch, recess, etc.)
              </span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.school_id}>
              {editingSlot ? 'Update' : 'Add'} Time Slot
            </Button>
          </div>
        </div>
      </Modal>

      {/* Copy to Days Modal */}
      <Modal
        isOpen={isCopyModalOpen}
        onClose={() => {
          setIsCopyModalOpen(false);
          setCopySourceDay('');
          setSelectedDays([]);
        }}
        title={`${DAY_NAMES[copySourceDay]} Gününü Kopyala`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{DAY_NAMES[copySourceDay]}</strong> gününün tüm zaman dilimlerini hangi günlere kopyalamak istiyorsunuz?
          </p>

          <div className="space-y-2">
            {DAYS.filter(day => day !== copySourceDay).map((day) => (
              <label
                key={day}
                className="flex items-center p-3 rounded-md border border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedDays.includes(day)}
                  onChange={() => handleToggleDay(day)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">
                  {DAY_NAMES[day]}
                </span>
              </label>
            ))}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-xs text-yellow-800">
              <strong>Uyarı:</strong> Seçilen günlerdeki mevcut zaman dilimleri silinecek ve {DAY_NAMES[copySourceDay]} gününün dilimleriyle değiştirilecektir.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCopyModalOpen(false);
                setCopySourceDay('');
                setSelectedDays([]);
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleCopyToSelectedDays}
              disabled={selectedDays.length === 0}
            >
              {selectedDays.length > 0 ? `${selectedDays.length} Güne Kopyala` : 'Gün Seçin'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Duplicate Within Day Modal */}
      <Modal
        isOpen={isDuplicateModalOpen}
        onClose={() => {
          setIsDuplicateModalOpen(false);
          setDuplicateDay('');
          setDuplicateCount(1);
        }}
        title={`${DAY_NAMES[duplicateDay]} Gününde Çoğalt`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{DAY_NAMES[duplicateDay]}</strong> gününün mevcut time slot'larını gün içinde sıralı şekilde kaç kez çoğaltmak istiyorsunuz?
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Çoğaltma Sayısı
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={duplicateCount}
              onChange={(e) => setDuplicateCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Örnek: 1 girerseniz, mevcut slot'lar 1 kez daha oluşturulur (toplam 2 set olur)
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-800">
              <strong>Bilgi:</strong> Slot'lar otomatik olarak sıralı zaman hesaplamasıyla oluşturulacaktır.
              Örneğin: 1. Ders 08:30-09:10, 1. Ara 09:10-09:20 ise, bir sonraki set 09:20'den başlayacaktır.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDuplicateModalOpen(false);
                setDuplicateDay('');
                setDuplicateCount(1);
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleDuplicateSlots}
              disabled={duplicateCount < 1}
            >
              {duplicateCount > 0 ? `${duplicateCount} Kez Çoğalt` : 'Sayı Girin'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

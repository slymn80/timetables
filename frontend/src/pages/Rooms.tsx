import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import AvailabilityGrid from '../components/common/AvailabilityGrid';
import SchoolFilterBanner from '../components/common/SchoolFilterBanner';
import { useAcademicYear } from '../context/AcademicYearContext';
import { roomService } from '../lib/services';
import type { Room } from '../types';

const COLOR_PALETTE = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
  '#DC2626', '#EA580C', '#059669', '#2563EB', '#7C3AED',
  '#DB2777', '#0D9488', '#C2410C', '#4F46E5', '#65A30D',
  '#BE123C', '#B45309', '#047857', '#1D4ED8', '#6D28D9'
];

export default function Rooms() {
  const { selectedSchoolId } = useAcademicYear();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    school_id: '',
    name: '',
    short_name: '',
    room_type: 'classroom',
    capacity: 30,
    floor: '',
    building: '',
    has_smartboard: false,
    color_code: COLOR_PALETTE[0],
    unavailable_slots: {} as Record<string, number[]>,
  });

  useEffect(() => {
    if (selectedSchoolId) {
      loadRooms();
    } else {
      setLoading(false);
    }
  }, [selectedSchoolId]);

  const loadRooms = async () => {
    try {
      const response = await roomService.getAll(selectedSchoolId!);
      setRooms(response.rooms || []);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingRoom) {
        await roomService.update(editingRoom.id, {
          ...formData,
          floor: formData.floor ? parseInt(formData.floor) : undefined,
        });
      } else {
        await roomService.create({
          ...formData,
          floor: formData.floor ? parseInt(formData.floor) : undefined,
        });
      }
      await loadRooms();
      setIsModalOpen(false);
      setEditingRoom(null);
      setFormData({
        school_id: selectedSchoolId || '',
        name: '',
        short_name: '',
        room_type: 'classroom',
        capacity: 30,
        floor: '',
        building: '',
        has_smartboard: false,
        color_code: COLOR_PALETTE[0],
        unavailable_slots: {},
      });
    } catch (error) {
      console.error('Failed to save room:', error);
      alert('Failed to save room');
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      school_id: room.school_id,
      name: room.name,
      short_name: room.short_name || '',
      room_type: room.room_type,
      capacity: room.capacity || 30,
      floor: room.floor?.toString() || '',
      building: room.building || '',
      has_smartboard: room.has_smartboard || false,
      color_code: room.color_code || COLOR_PALETTE[0],
      unavailable_slots: room.unavailable_slots || {},
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (room: Room) => {
    if (window.confirm(`Are you sure you want to delete ${room.name}?`)) {
      try {
        await roomService.delete(room.id);
        await loadRooms();
      } catch (error) {
        console.error('Failed to delete room:', error);
        alert('Failed to delete room');
      }
    }
  };

  const handleAdd = () => {
    setEditingRoom(null);
    setFormData({
      school_id: selectedSchoolId || '',
      name: '',
      short_name: '',
      room_type: 'classroom',
      capacity: 30,
      floor: '',
      building: '',
      has_smartboard: false,
      color_code: COLOR_PALETTE[0],
      unavailable_slots: {},
    });
    setIsModalOpen(true);
  };

  return (
    <div>
      <SchoolFilterBanner />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Rooms</h1>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>
        </div>

      <Card>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No rooms found. Click "Add Room" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Short Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Building/Floor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {room.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {room.short_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="capitalize">{room.room_type.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {room.capacity || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {room.building && room.floor
                        ? `${room.building} / Floor ${room.floor}`
                        : room.building || room.floor || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          room.is_available
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {room.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(room)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(room)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Room Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRoom(null);
        }}
        title={editingRoom ? "Edit Room" : "Add New Room"}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Room 101, Science Lab A"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Name
            </label>
            <input
              type="text"
              value={formData.short_name}
              onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
              placeholder="e.g., 101, SciA"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.room_type}
                onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="classroom">Classroom</option>
                <option value="laboratory">Laboratory</option>
                <option value="gym">Gym</option>
                <option value="library">Library</option>
                <option value="computer_lab">Computer Lab</option>
                <option value="music_room">Music Room</option>
                <option value="art_room">Art Room</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity
              </label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Building
              </label>
              <input
                type="text"
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                placeholder="e.g., Main Building, Block A"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Floor
              </label>
              <input
                type="number"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                placeholder="e.g., 1, 2, 3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Color
            </label>
            <div className="space-y-2">
              <div className="flex gap-1.5 flex-wrap">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color_code: color })}
                    className={`w-7 h-7 rounded-md border-2 transition-all ${
                      formData.color_code === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <input
                type="color"
                value={formData.color_code}
                onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                className="w-full h-10 px-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Availability Grid */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Odanın Müsait Olmadığı Saatler</h3>
            <AvailabilityGrid
              value={formData.unavailable_slots}
              onChange={(value) => setFormData(prev => ({ ...prev, unavailable_slots: value }))}
              maxPeriods={8}
              workingDays={[1, 2, 3, 4, 5]}
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.has_smartboard}
                onChange={(e) => setFormData({ ...formData, has_smartboard: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Has Smartboard
              </span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => {
              setIsModalOpen(false);
              setEditingRoom(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.school_id || !formData.name}>
              {editingRoom ? 'Update Room' : 'Add Room'}
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
}

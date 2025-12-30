import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import SchoolFilterBanner from '../components/common/SchoolFilterBanner';
import { useAcademicYear } from '../context/AcademicYearContext';
import { timeSlotTemplateService } from '../lib/services';

interface TimeSlotTemplate {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export default function TimeSlots() {
  const navigate = useNavigate();
  const { selectedSchoolId } = useAcademicYear();
  const [templates, setTemplates] = useState<TimeSlotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TimeSlotTemplate | null>(null);
  const [formData, setFormData] = useState({
    school_id: '',
    name: '',
    description: '',
  });

  useEffect(() => {
    if (selectedSchoolId) {
      loadTemplates();
      setFormData(prev => ({ ...prev, school_id: selectedSchoolId }));
    } else {
      setLoading(false);
    }
  }, [selectedSchoolId]);

  const loadTemplates = async () => {
    try {
      const templatesRes = await timeSlotTemplateService.getAll(selectedSchoolId!);
      setTemplates(templatesRes.templates || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (templateId: string) => {
    navigate(`/time-slots/${templateId}`);
  };

  const handleEdit = (template: TimeSlotTemplate) => {
    setEditingTemplate(template);
    setFormData({
      school_id: template.school_id,
      name: template.name,
      description: template.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (template: TimeSlotTemplate) => {
    const confirmed = window.confirm(
      `"${template.name}" şablonunu silmek istediğinize emin misiniz?`
    );

    if (!confirmed) return;

    try {
      await timeSlotTemplateService.delete(template.id);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Şablon silme işlemi başarısız oldu.');
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Lütfen şablon adı girin.');
      return;
    }

    try {
      if (editingTemplate) {
        await timeSlotTemplateService.update(editingTemplate.id, {
          name: formData.name,
          description: formData.description || undefined,
        });
      } else {
        await timeSlotTemplateService.create({
          school_id: formData.school_id,
          name: formData.name,
          description: formData.description || undefined,
        });
      }

      await loadTemplates();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Şablon kaydetme başarısız oldu.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setFormData({
      school_id: schools[0]?.id || '',
      name: '',
      description: '',
    });
  };

  return (
    <div>
      <SchoolFilterBanner />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Zaman Dilimi Şablonları</h1>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Şablon
          </Button>
        </div>

      {loading ? (
        <Card>
          <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
        </Card>
      ) : templates.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-gray-500">
            Henüz şablon bulunmuyor. "Yeni Şablon" butonuna tıklayarak oluşturabilirsiniz.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id}>
              <div className="space-y-4">
                <div
                  className="cursor-pointer"
                  onClick={() => handleView(template.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <h3 className="font-bold text-lg text-gray-900">{template.name}</h3>
                    </div>
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-600 mt-2">{template.description}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(template);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Düzenle"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(template);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Template Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTemplate ? 'Şablonu Düzenle' : 'Yeni Şablon Oluştur'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Şablon Adı"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="ör. Kış Dönemi, Yaz Dönemi"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Açıklama (Opsiyonel)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Şablon hakkında kısa açıklama..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={handleCloseModal}>
              İptal
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.school_id || !formData.name.trim()}>
              {editingTemplate ? 'Güncelle' : 'Oluştur'}
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
}

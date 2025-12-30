import api from './api';

export const lessonGroupService = {
  // Get all groups for a specific lesson
  getByLesson: async (lessonId: string) => {
    const response = await api.get(`/lesson-groups/lesson/${lessonId}`);
    return response.data;
  },

  // Update a lesson group (mainly for teacher assignment)
  update: async (groupId: string, data: any) => {
    const response = await api.put(`/lesson-groups/${groupId}`, data);
    return response.data;
  },

  // Regenerate lesson groups based on lesson.num_groups
  regenerate: async (lessonId: string) => {
    const response = await api.post(`/lesson-groups/lesson/${lessonId}/regenerate`);
    return response.data;
  },
};

// Mock API для GitHub Pages
export const api = {
  // Моковые данные для дашборда
  fetchDashboard: async () => {
    return {
      status: 'ACTIVE',
      done: 42,
      total: 100,
      nextId: 'TRUCK-789',
      nextTime: '15:30',
      activeList: [
        { id: 'TRUCK-123', start: '08:30', zone: 'A' },
        { id: 'TRUCK-456', start: '10:15', zone: 'B' },
        { id: 'TRUCK-789', start: '12:45', zone: 'C' },
      ]
    };
  },

  // Моковые задачи
  fetchTasks: async (mode: string) => {
    return [
      { id: 'CONT-001', time: '09:00', status: 'WAIT', type: 'BS', pallets: 20, phone: '+79161234567' },
      { id: 'CONT-002', time: '10:30', status: 'ACTIVE', type: 'AS', pallets: 15, phone: '+79167654321' },
      { id: 'CONT-003', time: '12:00', status: 'WAIT', type: 'PS', pallets: 25, phone: '+79169000000' },
    ];
  },

  fetchHistory: async (dateStr: string) => {
    return [
      { id: 'CONT-PREV-1', time: '08:00', status: 'DONE', type: 'BS', pallets: 18 },
      { id: 'CONT-PREV-2', time: '11:30', status: 'DONE', type: 'AS', pallets: 22 },
    ];
  },

  fetchFullPlan: async (dateStr: string) => {
    return [
      { rowIndex: 1, lot: 'LOT-001', ws: 'WS-1', pallets: '20', id: 'CONT-001', phone: '+79161234567', eta: '09:00' },
      { rowIndex: 2, lot: 'LOT-002', ws: 'WS-2', pallets: '15', id: 'CONT-002', phone: '+79167654321', eta: '10:30' },
    ];
  },

  createPlan: async (dateStr: string, tasks: any[]) => {
    console.log('Plan created:', dateStr, tasks);
    return true;
  },

  updatePlanRow: async (dateStr: string, row: any) => {
    console.log('Row updated:', dateStr, row);
    return true;
  },

  fetchAllContainers: async () => {
    return ['CONT-001', 'CONT-002', 'CONT-003', 'CONT-004'];
  },

  fetchIssues: async () => {
    return [
      { id: 'ISSUE-001', description: 'Повреждена упаковка', author: 'Иванов И.', timestamp: '2026-01-31 10:30' },
      { id: 'ISSUE-002', description: 'Нет водителя', author: 'Петров П.', timestamp: '2026-01-31 11:45' },
    ];
  },

  // Моковый вход (работает без сервера)
  login: async (user: string, pass: string) => {
    // Тестовые пользователи
    const testUsers = {
      'operator': { name: 'Иванов Иван', role: 'OPERATOR' },
      'logistic': { name: 'Петрова Мария', role: 'LOGISTIC' },
      'admin': { name: 'Сидоров Алексей', role: 'ADMIN' },
    };

    if (testUsers[user as keyof typeof testUsers] && pass === '123') {
      return { 
        success: true, 
        ...testUsers[user as keyof typeof testUsers] 
      };
    }
    return { success: false };
  },

  register: async (user: string, pass: string, name: string) => {
    console.log('Registration:', { user, pass, name });
    return true;
  },

  uploadPhoto: async (image: string, mimeType: string, filename: string) => {
    return `https://via.placeholder.com/400x300/1E807D/FFFFFF?text=Photo+${filename}`;
  },

  taskAction: async (id: string, act: string, user: string, zone: string = '', pGen: string = '', pSeal: string = '', pEmpty: string = '') => {
    console.log(`Task ${id} ${act} by ${user}`, { zone, pGen, pSeal, pEmpty });
  },

  reportIssue: async (id: string, desc: string, photos: string[], author: string) => {
    console.log('Issue reported:', { id, desc, photos, author });
  }
};

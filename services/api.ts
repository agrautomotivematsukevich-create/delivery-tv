// Временный API клиент
export const api = {
  async getData() {
    return { message: 'API работает' };
  },
  
  async postData(data: any) {
    return { success: true, data };
  }
};

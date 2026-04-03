/* CloudLibrary API Client */

const API = (() => {
  const BASE = '/api';

  function getToken() { return localStorage.getItem('cl_token'); }
  function setToken(t) { localStorage.setItem('cl_token', t); }
  function clearToken() { localStorage.removeItem('cl_token'); localStorage.removeItem('cl_user'); }

  function getUser() {
    try { return JSON.parse(localStorage.getItem('cl_user')); } catch { return null; }
  }
  function setUser(u) { localStorage.setItem('cl_user', JSON.stringify(u)); }

  async function request(method, path, body, isFormData = false) {
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    const res = await fetch(BASE + path, opts);
    if (res.status === 401) {
      clearToken();
      window.dispatchEvent(new Event('auth:logout'));
    }
    const data = res.headers.get('content-type')?.includes('json') ? await res.json() : { message: await res.text() };
    if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  }

  return {
    getToken, setToken, clearToken, getUser, setUser,
    isLoggedIn: () => !!getToken(),

    // Auth
    auth: {
      register: (data) => request('POST', '/auth/register', data),
      login: (data) => request('POST', '/auth/login', data),
      me: () => request('GET', '/auth/me'),
    },

    // Books
    books: {
      list: (params = {}) => request('GET', '/books?' + new URLSearchParams(params)),
      featured: () => request('GET', '/books/featured'),
      genres: () => request('GET', '/books/genres'),
      get: (id) => request('GET', `/books/${id}`),
      reviews: (id) => request('GET', `/books/${id}/reviews`),
      addReview: (id, data) => request('POST', `/books/${id}/reviews`, data),
      download: (id) => BASE + `/books/${id}/download`,
      upload: (formData) => request('POST', '/books/upload', formData, true),
      delete: (id) => request('DELETE', `/books/${id}`),
    },

    // Users
    users: {
      profile: (id) => request('GET', `/users/${id}/profile`),
      updateProfile: (data) => request('PUT', '/users/profile', data),
      changePassword: (data) => request('PUT', '/users/password', data),
      library: () => request('GET', '/users/library'),
      addToLibrary: (bookId, status) => request('POST', `/users/library/${bookId}`, { status }),
      removeFromLibrary: (bookId) => request('DELETE', `/users/library/${bookId}`),
      wantToRead: () => request('GET', '/users/want-to-read'),
      addWantToRead: (bookId) => request('POST', `/users/want-to-read/${bookId}`, {}),
      removeWantToRead: (bookId) => request('DELETE', `/users/want-to-read/${bookId}`),
      contributions: () => request('GET', '/users/contributions'),
    },
  };
})();

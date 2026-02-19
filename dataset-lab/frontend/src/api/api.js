import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const projectApi = {
    list: () => api.get('/projects/').then(res => res.data),
    create: (name) => api.post('/projects/', { name }).then(res => res.data),
    getStatus: (name) => api.get(`/projects/${name}/status`).then(res => res.data),
    upload: (name, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/projects/${name}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }).then(res => res.data);
    },
    runPipeline: (name, config) => api.post(`/projects/${name}/run`, config).then(res => res.data),
    export: (name, format) => api.get(`/projects/${name}/export`, {
        params: { format },
        responseType: 'blob'
    }).then(res => res),
    getCleanedText: (name) => api.get(`/projects/${name}/data/cleaned`).then(res => res.data),
    getChunks: (name) => api.get(`/projects/${name}/data/chunks`).then(res => res.data),
    getQAPairs: (name) => api.get(`/projects/${name}/data/qa`).then(res => res.data),
    delete: (name) => api.delete(`/projects/${name}`).then(res => res.data),
};

export const llmApi = {
    getOllamaModels: () => api.get('/llm/ollama/models').then(res => res.data),
};

export default api;

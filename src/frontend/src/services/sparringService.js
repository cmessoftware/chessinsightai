import api from './api.js'

export async function fetchSparringStatus() {
  const { data } = await api.get('/api/v1/sparring/status')
  return data
}

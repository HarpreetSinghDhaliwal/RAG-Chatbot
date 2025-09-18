import axios from "axios";

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

export const createSession = async () => {
  const res = await axios.post(`${BASE_URL}/api/session`);
  return res.data.sessionId;
};

export const fetchHistory = async (sessionId) => {
  const res = await axios.get(`${BASE_URL}/api/session/${sessionId}/history`);
  return res.data;
};

export const resetSession = async (sessionId) => {
  await axios.delete(`${BASE_URL}/api/session/${sessionId}`);
};

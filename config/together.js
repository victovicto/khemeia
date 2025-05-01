import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const togetherAPI = axios.create({
  baseURL: 'https://api.together.xyz/v1/chat/completions',
  headers: {
    'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
    'Content-Type': 'application/json',
  }
});

export default togetherAPI;



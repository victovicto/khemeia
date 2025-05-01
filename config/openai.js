import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();
console.log("Chave OpenAI:", process.env.OPENAI_API_KEY ? "carregada" : "NÃO carregada");


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;


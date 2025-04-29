import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config(); // A importação correta para a versão 4.96.0

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Certifique-se de ter a chave da API configurada no .env
});

export default openai;

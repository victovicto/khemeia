import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import moleculeRoutes from './routes/molecule.js'; // Importe as rotas de moléculas
import path from 'path';
import { fileURLToPath } from 'url';
import quizRoutes from './routes/quiz.js';


dotenv.config();

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Conectar ao MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB conectado"))
  .catch(err => console.error("Erro ao conectar ao MongoDB:", err));

// Rota de teste
app.get("/", (_req, res) => res.send("Servidor rodando!"));

app.use('/auth', authRoutes); // Rotas de autenticação
app.use('/molecule', moleculeRoutes);
app.use('/quiz', quizRoutes); // Rotas de moléculas

console.log("Rotas carregadas!");

const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));



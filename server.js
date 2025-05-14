import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import moleculeRoutes from './routes/molecule.js';
import quizRoutes from './routes/quiz.js';
import desempenhoRoutes from './routes/desempenho.js';
import assuntoRoutes from './routes/assunto.js'; // Nova importação
import aiRoute from './routes/ai.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de CORS e JSON
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Conexão com o MongoDB
const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ MongoDB conectado com sucesso");
  } catch (err) {
    console.error("❌ Erro ao conectar ao MongoDB:", err.message);
    process.exit(1);
  }
};
connectToDatabase();

// Rotas
app.get("/", (_req, res) => res.send("Servidor rodando com sucesso! 🚀"));
app.use('/auth', authRoutes);
app.use('/molecule', moleculeRoutes);
app.use('/quiz', quizRoutes);
app.use('/desempenho', desempenhoRoutes);
app.use('/assunto', assuntoRoutes); // Nova rota
app.use('/ai', aiRoute);

// Log de carregamento das rotas
console.log("📦 Todas as rotas foram carregadas com sucesso!");

// Configuração do caminho atual (necessária para __dirname no ES module)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`🌐 Servidor rodando na porta ${PORT}`);
});
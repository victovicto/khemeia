import mongoose from 'mongoose';

const alternativaSchema = new mongoose.Schema({
  letra: String,
  texto: String,
  correta: Boolean
});

const questionSchema = new mongoose.Schema({
  enunciado: String,
  imagem: String, // URL da imagem da questão (pode ser nula)
  alternativas: [alternativaSchema],
  assunto: String,
  dificuldade: String,
  ano: Number,
  fonte: String
});

export default mongoose.model('Question', questionSchema);
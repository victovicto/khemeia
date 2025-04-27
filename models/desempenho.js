import mongoose from 'mongoose';

const respostaSchema = new mongoose.Schema({
  usuarioId: String,
  questaoId: String,
  assunto: String,
  acertou: Boolean,
  data: {
    type: Date,
    default: Date.now,
  }
});

const Desempenho = mongoose.model('Desempenho', respostaSchema);

export default Desempenho;

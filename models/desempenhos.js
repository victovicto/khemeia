import mongoose from 'mongoose';

const respostaSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario', // Referência ao modelo Usuario
    required: true
  },
  questaoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Questao', // Referência ao modelo de Questao (caso exista)
    required: true
  },
  assunto: {
    type: String,
    required: true,
  },
  acertou: {
    type: Boolean,
    required: true,
  },
  data: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true, // Isso cria os campos 'createdAt' e 'updatedAt' automaticamente
  collection: 'desempenhos' // Certificando-se de que a coleção seja 'desempenhos'
});

const Desempenho = mongoose.model('Desempenho', respostaSchema);

export default Desempenho;

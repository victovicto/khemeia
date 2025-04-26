const mongoose = require('mongoose');

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

module.exports = mongoose.model('Desempenho', respostaSchema);

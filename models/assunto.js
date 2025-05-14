import mongoose from 'mongoose';

// Schema para as questões dentro do assunto
const questaoSchema = new mongoose.Schema({
  pergunta: {
    type: String,
    required: true
  },
  alternativas: [{
    texto: String,
    correta: Boolean
  }],
  explicacao: {
    type: String,
    required: true
  }
});

// Schema principal para assuntos
const assuntoSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    unique: true
  },
  descricao: {
    type: String,
    required: true
  },
  resumo: {
    type: String,
    required: true
  },
  videoUrl: {
    type: String,
    required: true
  },
  questoes: {
    type: [questaoSchema],
    validate: [
      {
        validator: function(questoes) {
          return questoes.length <= 5;
        },
        message: 'Cada assunto deve ter no máximo 5 questões'
      },
      {
        validator: function(questoes) {
          return questoes.length > 0;
        },
        message: 'Cada assunto deve ter pelo menos 1 questão'
      }
    ]
  },
  ativo: {
    type: Boolean,
    default: true
  },
  ordem: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'assuntos'
});

const Assunto = mongoose.model('Assunto', assuntoSchema);

export default Assunto;
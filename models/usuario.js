import mongoose from 'mongoose';

// Defina o esquema para o usuário
const usuarioSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true // Garantir que o email seja único
  },
  senha: {
    type: String,
    required: true
  }
}, {
  collection: 'usuarios' // Especificando a coleção 'usuarios'
});

// Criando o modelo
const Usuario = mongoose.model('Usuario', usuarioSchema);

export default Usuario;

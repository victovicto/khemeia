import express from 'express';
import autenticarToken from '../middleware/authid.js';  // Importando o middleware corretamente
import Desempenho from '../models/desempenhos.js';  // Certifique-se de que o modelo esteja correto

const router = express.Router();

// Rota POST /desempenho (Salvar uma resposta do round)
router.post('/', autenticarToken, async (req, res) => {  // Usando o middleware de autenticação
  const usuarioId = req.usuarioId;  // Agora o usuarioId está disponível através do middleware
  const { questaoId, assunto, acertou } = req.body;

  console.log('Resposta recebida:', { questaoId, assunto, acertou }); // 🔍 Verificando o que chega do Flutter

  // Validação das respostas
  if (!questaoId || typeof questaoId !== 'string' || questaoId.trim() === '') {
    return res.status(400).json({ erro: 'Questão inválida.' });
  }

  if (typeof acertou !== 'boolean') {
    return res.status(400).json({ erro: 'Valor de "acertou" inválido.' });
  }

  if (!assunto || typeof assunto !== 'string' || assunto.trim() === '') {
    return res.status(400).json({ erro: 'Assunto inválido.' });
  }

  try {
    // Preparando para salvar no banco
    const respostaParaSalvar = {
      usuarioId,
      questaoId,
      assunto,
      acertou,
      data: new Date(),
    };

    await Desempenho.create(respostaParaSalvar);  // Salva a resposta no banco de dados

    res.status(201).json({ mensagem: 'Resposta salva com sucesso.' });

  } catch (error) {
    console.error('Erro ao salvar resposta:', error);
    res.status(500).json({ erro: 'Erro interno ao salvar a resposta.' });
  }
});

export default router;

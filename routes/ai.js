import express from 'express';
import togetherAPI from '../config/together.js';

const router = express.Router();

// Endpoint: Curiosidade + aplicação do composto
router.post('/composto', async (req, res) => {
  const { nome } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: 'Nome do composto não fornecido.' });
  }

  const prompt = `Me fale uma curiosidade interessante para estudantes do ensino médio e uma aplicação cotidiana do composto químico chamado "${nome}". Responda em português.`;

  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300
    });

    const resultado = response.data.choices?.[0]?.message?.content || "Resposta não encontrada.";
    res.json({ resposta: resultado });
  } catch (err) {
    console.error('Erro na requisição Together AI:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Falha ao gerar resposta da IA', detalhes: err.message });
  }
});

// Endpoint: Nome IUPAC da molécula
router.post('/nome-molecula', async (req, res) => {
  const { molfile } = req.body;

  if (!molfile) {
    return res.status(400).json({ erro: 'Molfile não fornecido.' });
  }

  const prompt = `Analise o seguinte Molfile e forneça apenas o nome oficial da molécula com base na nomenclatura IUPAC, em português.\nMolfile:\n"""${molfile}"""`;

  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 100
    });

    const nome = response.data.choices?.[0]?.message?.content?.trim() || "Nome não identificado";
    res.json({ nome });
  } catch (err) {
    console.error('Erro ao gerar nome da molécula:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Falha ao gerar nome da molécula', detalhes: err.message });
  }
});

// Endpoint: Geração de perguntas de múltipla escolha
router.post('/gerar-perguntas', async (req, res) => {
  await gerarPerguntasHandler(req, res);
});

// Endpoint: Análise completa da molécula (nome + perguntas)
router.post('/analisar-molecula', async (req, res) => {
  await gerarPerguntasHandler(req, res);
});

// Função reutilizável para geração de perguntas
async function gerarPerguntasHandler(req, res) {
  const { molfile } = req.body;

  if (!molfile) {
    return res.status(400).json({ erro: 'Molfile não fornecido.' });
  }

  const prompt = gerarPromptPerguntas(molfile);

  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    });

    const resultado = response.data.choices?.[0]?.message?.content || "";
    const perguntas = processarPerguntasComAlternativas(resultado).filter(p => p);
    res.json({ perguntas });
  } catch (err) {
    console.error('Erro ao gerar perguntas:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Falha ao gerar perguntas', detalhes: err.message });
  }
}

// Função auxiliar para gerar prompt
function gerarPromptPerguntas(molfile) {
  return `
Analise o seguinte arquivo Molfile:

\`\`\`
${molfile}
\`\`\`

Com base na estrutura molecular, gere 5 perguntas de múltipla escolha voltadas para o ensino médio.

Cada pergunta deve conter:
- Enunciado
- Quatro alternativas (A, B, C, D)
- Indicação da resposta correta

As perguntas devem abordar:
- Grupos funcionais presentes
- Propriedades físico-químicas
- Nome IUPAC (em português)
- Aplicações práticas
- Reações típicas

Formato:
Pergunta 1: [enunciado]  
A) [alternativa A]  
B) [alternativa B]  
C) [alternativa C]  
D) [alternativa D]  
Resposta correta: [letra]
`;
}

// Função auxiliar para estruturar perguntas
function processarPerguntasComAlternativas(texto) {
  const blocos = texto.split(/Pergunta\s*\d+:/i).filter(b => b.trim());

  return blocos.map(bloco => {
    const enunciadoMatch = bloco.match(/^(.*?)(?:\n|$)/);
    const alternativas = {};
    const alternativaRegex = /([A-D])\)\s*(.*)/g;
    let match;

    while ((match = alternativaRegex.exec(bloco)) !== null) {
      alternativas[match[1]] = match[2].trim();
    }

    const respostaMatch = bloco.match(/Resposta\s+correta\s*:\s*([A-D])/i);
    const respostaCorreta = respostaMatch ? respostaMatch[1].toUpperCase() : null;

    if (!enunciadoMatch || Object.keys(alternativas).length < 4 || !respostaCorreta) {
      console.warn("Pergunta mal formatada detectada. Ignorando.");
      return null;
    }

    return {
      enunciado: enunciadoMatch[1].trim(),
      alternativas,
      correta: respostaCorreta
    };
  });
}

export default router;

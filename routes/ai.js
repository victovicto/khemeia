import express from 'express';
import togetherAPI from '../config/together.js';

const router = express.Router();

// Endpoint para fornecer curiosidades sobre o composto
router.post('/composto', async (req, res) => {
  const { nome } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: 'Nome do composto não fornecido.' });
  }

  const prompt = `Me fale uma curiosidade em relação ao composto que seja interessante ao estudante de ensino médio e uma aplicação do composto químico chamado "${nome}" no cotidiano, e responda em português.`;

  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300
    });

    const resultado = response.data.choices[0].message.content || "Resposta não encontrada";
    res.json({ resposta: resultado });
  } catch (err) {
    console.error('Erro na requisição Together AI:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Falha ao gerar resposta da IA', detalhes: err.message });
  }
});

// Endpoint para gerar perguntas com alternativas baseadas no Molfile
router.post('/gerar-perguntas', async (req, res) => {
  const { molfile } = req.body;

  if (!molfile) {
    return res.status(400).json({ erro: 'Molfile não fornecido.' });
  }

  const prompt = `
Analise o seguinte arquivo Molfile que representa uma estrutura molecular:

\`\`\`
${molfile}
\`\`\`

Com base nesta molécula, gere 5 perguntas de múltipla escolha sobre ela, voltadas para estudantes do ensino médio.

Cada pergunta deve conter:
- Enunciado direcionado à molécula analisada
- Quatro alternativas (A, B, C, D)
- Indicação da resposta correta

As perguntas devem abordar:
- Grupos funcionais presentes
- Propriedades físico-químicas da molécula
- Nome IUPAC provável
- Aplicações práticas
- Reações químicas típicas dessa molécula

Formato da resposta:

Pergunta 1: [enunciado]  
A) [alternativa A]  
B) [alternativa B]  
C) [alternativa C]  
D) [alternativa D]  
Resposta correta: [letra]

(Repita para 5 perguntas)
`;

  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    });

    const resultado = response.data.choices[0].message.content || "";
    const perguntas = processarPerguntasComAlternativas(resultado);

    res.json({ perguntas });
  } catch (err) {
    console.error('Erro ao gerar perguntas:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Falha ao gerar perguntas', detalhes: err.message });
  }
});

// Endpoint para fornecer nome IUPAC da molécula
router.post('/nome-molecula', async (req, res) => {
  const { molfile } = req.body;

  if (!molfile) {
    return res.status(400).json({ erro: 'Molfile não fornecido.' });
  }

  const prompt = `Analise o seguinte Molfile e forneça apenas o nome oficial da molécula com base na nomenclatura IUPAC, em português. Molfile: """${molfile}""".`;

  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 100
    });

    const nome = response.data.choices[0].message.content.trim();
    res.json({ nome });
  } catch (err) {
    console.error('Erro ao gerar nome da molécula:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Falha ao gerar nome da molécula', detalhes: err.message });
  }
});

// Endpoint combinado para análise completa da molécula (perguntas e nome IUPAC)
router.post('/analisar-molecula', async (req, res) => {
  const { molfile } = req.body;

  if (!molfile) {
    return res.status(400).json({ erro: 'Molfile não fornecido.' });
  }

  const prompt = `
Analise o seguinte arquivo Molfile que representa uma estrutura molecular:

\`\`\`
${molfile}
\`\`\`

Com base nesta molécula, gere 5 perguntas de múltipla escolha sobre ela, voltadas para estudantes do ensino médio.

Cada pergunta deve conter:
- Enunciado direcionado à molécula analisada
- Quatro alternativas (A, B, C, D)
- Indicação da resposta correta

As perguntas devem abordar:
- Grupos funcionais presentes
- Propriedades físico-químicas da molécula
- Nome IUPAC provável
- Aplicações práticas
- Reações químicas típicas dessa molécula

Formato da resposta:

Pergunta 1: [enunciado]  
A) [alternativa A]  
B) [alternativa B]  
C) [alternativa C]  
D) [alternativa D]  
Resposta correta: [letra]

(Repita para 5 perguntas)
`;

  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    });

    const resultado = response.data.choices[0].message.content || "";
    const perguntas = processarPerguntasComAlternativas(resultado);

    res.json({ perguntas });
  } catch (err) {
    console.error('Erro na análise da molécula:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Falha ao analisar molécula', detalhes: err.message });
  }
});

// Função para processar perguntas com alternativas
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

    return {
      enunciado: enunciadoMatch ? enunciadoMatch[1].trim() : '',
      alternativas,
      correta: respostaCorreta
    };
  });
}

export default router;

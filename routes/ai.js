import express from 'express'; 
import togetherAPI from '../config/together.js';
import cors from 'cors'; // Certifique-se de importar o módulo cors

const router = express.Router();

// Configuração do CORS para permitir requisições do frontend
router.use(cors({
  origin: function(origin, callback) {
    // Permitir requisições sem origem (como Postman, curl, etc)
    if (!origin) return callback(null, true);
    
    // Lista de origens permitidas
    const allowedOrigins = [
      'http://localhost:3001',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'https://khemeia.onrender.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Origin', 'X-Requested-With']
}));

// Endpoint: Curiosidade + aplicação do composto
router.post('/composto', async (req, res) => {
  const { nome } = req.body;

  if (typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ erro: 'Nome do composto não fornecido ou inválido.' });
  }

  console.log(`Recebido nome para curiosidade: ${nome}`);

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

  if (typeof molfile !== 'string' || !molfile.trim()) {
    return res.status(400).json({ erro: 'Molfile não fornecido ou inválido.' });
  }

  console.log(`Recebido Molfile com ${molfile.length} caracteres.`);

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
  // Aceitar tanto "estrutura" quanto "molfile" no corpo da requisição para compatibilidade
  const { estrutura, tipo, molfile } = req.body;
  
  // Use molfile diretamente ou a estrutura fornecida (compatibilidade com versões antigas)
  let moleculeData = molfile || estrutura || "";
  
  if (typeof moleculeData !== 'string' || !moleculeData.trim()) {
    return res.status(400).json({ erro: 'Dados da molécula não fornecidos ou inválidos.' });
  }

  // Verificar se estamos recebendo um formato alternativo (SMILES ou KET)
  let formatoOriginal = 'molfile';
  if (moleculeData.startsWith('SMILES:')) {
    formatoOriginal = 'smiles';
    console.log('Recebendo formato SMILES');
    // Extrair apenas o SMILES sem o prefixo
    moleculeData = moleculeData.replace('SMILES:', '').trim();
  } else if (moleculeData.startsWith('KET:')) {
    formatoOriginal = 'ket';
    console.log('Recebendo formato KET');
    // Extrair apenas o KET sem o prefixo
    moleculeData = moleculeData.replace('KET:', '').trim();
  }

  console.log(`Analisando molécula (${formatoOriginal}) com ${moleculeData.length} caracteres...`);

  try {
    // Tratamento seguro dos dados da molécula
    const sanitizedMoleculeData = moleculeData.trim();
    
    // Ajustar prompt com base no formato recebido
    const promptBase = formatoOriginal === 'molfile' 
      ? `Analise o seguinte Molfile e`
      : formatoOriginal === 'smiles'
        ? `Analise a seguinte notação SMILES e`
        : `Analise a seguinte representação química e`;
    
    const promptNome = `${promptBase} forneça apenas o nome oficial da molécula com base na nomenclatura IUPAC, em português.\nDados:\n"""${sanitizedMoleculeData}"""`;
    const promptPerguntas = gerarPromptPerguntas(sanitizedMoleculeData, formatoOriginal);

    // Executar chamadas à API em paralelo para melhor performance
    const [resNome, resPerguntas] = await Promise.all([
      togetherAPI.post('', {
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        messages: [{ role: "user", content: promptNome }],
        temperature: 0.5,
        max_tokens: 100
      }),
      togetherAPI.post('', {
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        messages: [{ role: "user", content: promptPerguntas }],
        temperature: 0.7,
        max_tokens: 1000
      })
    ]);

    // Extrair e validar respostas
    if (!resNome.data || !resNome.data.choices || !resPerguntas.data || !resPerguntas.data.choices) {
      throw new Error('Resposta incompleta da API de IA');
    }

    const nome = resNome.data.choices[0]?.message?.content?.trim() || "Nome não identificado";
    const perguntasTexto = resPerguntas.data.choices[0]?.message?.content || "";
    
    // Processar as perguntas com tratamento de erro
    let perguntas = [];
    try {
      perguntas = processarPerguntasComAlternativas(perguntasTexto).filter(p => p);
    } catch (err) {
      console.error('Erro ao processar perguntas:', err);
      perguntas = [];
    }
    
    // Sempre retornar um JSON válido
    res.json({ nome, perguntas });
  } catch (err) {
    console.error('Erro detalhado ao analisar molécula:', err);
    
    // Garantir uma resposta de erro consistente
    res.status(500).json({ 
      erro: 'Falha ao analisar molécula', 
      detalhes: err.message || 'Erro desconhecido no servidor' 
    });
  }
});

// Função reutilizável para geração de perguntas
async function gerarPerguntasHandler(req, res) {
  // Aceitar tanto "estrutura" quanto "molfile" no corpo da requisição para compatibilidade
  const { estrutura, molfile } = req.body;
  
  // Use molfile diretamente ou a estrutura fornecida (compatibilidade com versões antigas)
  const moleculeData = molfile || estrutura || "";
  
  if (typeof moleculeData !== 'string' || !moleculeData.trim()) {
    return res.status(400).json({ erro: 'Dados da molécula não fornecidos ou inválidos.' });
  }

  console.log(`Gerando perguntas para molécula com ${moleculeData.length} caracteres.`);

  try {
    // Sanitização dos dados da molécula
    const sanitizedMoleculeData = moleculeData.trim();
    const prompt = gerarPromptPerguntas(sanitizedMoleculeData);

    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    });

    // Validar resposta da API
    if (!response.data || !response.data.choices) {
      throw new Error('Resposta inválida da API de IA');
    }

    const resultado = response.data.choices[0]?.message?.content || "";
    
    // Processar perguntas com tratamento de erro
    let perguntas = [];
    try {
      perguntas = processarPerguntasComAlternativas(resultado).filter(p => p);
    } catch (err) {
      console.error('Erro ao processar texto das perguntas:', err);
      perguntas = [];
    }
    
    res.json({ perguntas });
  } catch (err) {
    console.error('Erro detalhado ao gerar perguntas:', err);
    res.status(500).json({ erro: 'Falha ao gerar perguntas', detalhes: err.message || 'Erro desconhecido' });
  }
}

// Função auxiliar para gerar prompt com validação
function gerarPromptPerguntas(moleculeData, formato = 'molfile') {
  if (!moleculeData || typeof moleculeData !== 'string') {
    console.warn('Dados da molécula inválidos recebidos na função gerarPromptPerguntas');
    return '';
  }
  
  // Ajustar texto do prompt baseado no formato
  const formatoPrompt = formato === 'molfile' 
    ? 'arquivo Molfile' 
    : formato === 'smiles' 
      ? 'código SMILES' 
      : 'representação química';
  
  return `
Analise a seguinte ${formatoPrompt}:

\`\`\`
${moleculeData.trim()}
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

// Função auxiliar para estruturar perguntas com melhor tratamento de erros
function processarPerguntasComAlternativas(texto) {
  if (!texto || typeof texto !== 'string') {
    console.warn('Texto vazio ou inválido recebido para processamento de perguntas');
    return [];
  }

  try {
    // Dividir o texto em blocos de perguntas
    const blocos = texto.split(/Pergunta\s*\d+:/i).filter(b => b.trim());
    
    // Processar cada bloco
    return blocos.map(bloco => {
      try {
        // Extrair o enunciado (primeira linha)
        const enunciadoMatch = bloco.match(/^(.*?)(?:\n|$)/);
        if (!enunciadoMatch) {
          console.warn('Enunciado não encontrado em bloco de pergunta');
          return null;
        }
        
        // Extrair alternativas
        const alternativas = {};
        const alternativaRegex = /([A-D])\)\s*(.*?)(?=\s*(?:[A-D]\)|Resposta|$))/gs;
        
        let match;
        while ((match = alternativaRegex.exec(bloco)) !== null) {
          alternativas[match[1]] = match[2].trim();
        }
        
        // Se não encontrou alternativas com a regex acima, tenta outra abordagem
        if (Object.keys(alternativas).length < 4) {
          const linhas = bloco.split('\n');
          for (const linha of linhas) {
            const altMatch = linha.match(/^([A-D])\)\s*(.*)/);
            if (altMatch) {
              alternativas[altMatch[1]] = altMatch[2].trim();
            }
          }
        }

        // Extrair resposta correta
        const respostaMatch = bloco.match(/Resposta\s+correta\s*:\s*([A-D])/i);
        const respostaCorreta = respostaMatch ? respostaMatch[1].toUpperCase() : null;

        // Validar se temos todos os componentes necessários
        if (!enunciadoMatch || Object.keys(alternativas).length < 4 || !respostaCorreta) {
          console.warn("Pergunta mal formatada detectada. Detalhes:", {
            temEnunciado: !!enunciadoMatch,
            numAlternativas: Object.keys(alternativas).length,
            temResposta: !!respostaCorreta
          });
          return null;
        }

        // Objeto de pergunta válida
        return {
          enunciado: enunciadoMatch[1].trim(),
          alternativas: alternativas,
          correta: respostaCorreta
        };
      } catch (err) {
        console.error('Erro ao processar bloco de pergunta:', err);
        return null;
      }
    }).filter(Boolean); // Filtrar possíveis valores null
  } catch (err) {
    console.error('Erro geral no processarPerguntasComAlternativas:', err);
    return [];
  }
}

// Endpoint de health-check
router.get('/ping', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default router;
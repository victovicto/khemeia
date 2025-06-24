import express from 'express'; 
import togetherAPI from '../config/together.js';
import cors from 'cors';

const router = express.Router();

// Configuração do CORS para permitir requisições do frontend
router.use(cors({
  origin: function(origin, callback) {
    // Permitir requisições sem origem (como Postman, curl, etc)
    if (!origin) return callback(null, true);
    
    // Lista de origens permitidas
    const allowedOrigins = [
      'https://khemeia-osra.onrender.com',
      'https://khemeia.onrender.com',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ];
    
    console.log('Origem da requisição:', origin);
    
    // Em desenvolvimento, aceitar todas as origens
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Em produção, verificar se a origem está na lista permitida
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Caso seja uma origem não listada, mas que inclua o domínio render.com
      if (origin && (origin.includes('render.com') || origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        console.log('Permitindo requisição de origem não listada mas confiável:', origin);
        callback(null, true);
      } else {
        console.error('Origem bloqueada pelo CORS:', origin);
        callback(new Error('Não permitido pelo CORS'));
      }
    }
  },
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Accept', 'Origin', 'X-Requested-With', 'Authorization'],
  credentials: true
}));

// Endpoint principal: Análise da molécula com nome - gera curiosidade + quiz
router.post('/analisar-molecula', async (req, res) => {
  const { moleculeName, additionalInfo, source, method } = req.body;

  if (typeof moleculeName !== 'string' || !moleculeName.trim()) {
    return res.status(400).json({ erro: 'Nome da molécula não fornecido ou inválido.' });
  }

  console.log(`Analisando molécula: ${moleculeName}`);
  console.log(`Informações adicionais: ${additionalInfo || 'N/A'}`);
  console.log(`Fonte: ${source || 'N/A'}, Método: ${method || 'N/A'}`);

  try {
    // Executar análise da curiosidade e quiz em paralelo
    const [curiosidadeResult, quizResult] = await Promise.all([
      gerarCuriosidade(moleculeName),
      gerarQuiz(moleculeName)
    ]);

    const response = {
      nome: moleculeName,
      curiosidade: curiosidadeResult,
      perguntas: quizResult,
      metadata: {
        source: source || 'Desconhecido',
        method: method || 'Desconhecido',
        additionalInfo: additionalInfo || null,
        processedAt: new Date().toISOString()
      }
    };

    res.json(response);
  } catch (err) {
    console.error('Erro ao analisar molécula:', err);
    res.status(500).json({ 
      erro: 'Falha ao analisar molécula', 
      detalhes: err.message || 'Erro desconhecido no servidor' 
    });
  }
});

// Endpoint alternativo: Apenas curiosidade da molécula
router.post('/curiosidade-molecula', async (req, res) => {
  const { moleculeName, nome } = req.body;
  
  // Aceitar tanto 'moleculeName' quanto 'nome' para compatibilidade
  const nomeComposto = moleculeName || nome;

  if (typeof nomeComposto !== 'string' || !nomeComposto.trim()) {
    return res.status(400).json({ erro: 'Nome da molécula não fornecido ou inválido.' });
  }

  console.log(`Gerando curiosidade para: ${nomeComposto}`);

  try {
    const curiosidade = await gerarCuriosidade(nomeComposto);
    res.json({ resposta: curiosidade });
  } catch (err) {
    console.error('Erro ao gerar curiosidade:', err);
    res.status(500).json({ 
      erro: 'Falha ao gerar curiosidade da molécula', 
      detalhes: err.message 
    });
  }
});

// Função para gerar curiosidade da molécula
async function gerarCuriosidade(nomeComposto) {
  const prompt = `Para o composto químico "${nomeComposto}", escreva um parágrafo breve e interessante que:
1. Contenha uma curiosidade fascinante sobre o composto
2. Mencione uma aplicação comum ou importante na vida cotidiana
3. Se possível, adicione um fato surpreendente ou pouco conhecido

Escreva em um tom conversacional e informativo, como se estivesse explicando para um estudante curioso do ensino médio. Evite introduções como "Aqui está uma curiosidade" ou estruturas de pergunta e resposta. Mantenha o texto fluido e natural, sem exceder 4-5 frases.

IMPORTANTE: Responda SEMPRE em português brasileiro. Não use inglês ou qualquer outra língua.`;

  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300
    });

    let resultado = response.data.choices?.[0]?.message?.content || "Resposta não encontrada.";
    
    // Verificação básica de idioma e correção se necessário
    if (containsEnglishPhrases(resultado)) {
      console.warn('Resposta em inglês detectada, fazendo nova tentativa...');
      
      const retryPrompt = `Para o composto químico "${nomeComposto}", escreva um parágrafo breve e interessante em PORTUGUÊS BRASILEIRO (não em inglês):
1. Contenha uma curiosidade fascinante sobre o composto
2. Mencione uma aplicação comum na vida cotidiana
3. Adicione um fato surpreendente

IMPORTANTE: Esta resposta DEVE ser em português do Brasil. NÃO responda em inglês.`;

      const retryResponse = await togetherAPI.post('', {
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        messages: [{ role: "user", content: retryPrompt }],
        temperature: 0.7,
        max_tokens: 300
      });

      resultado = retryResponse.data.choices?.[0]?.message?.content || resultado;
    }

    return resultado;
  } catch (error) {
    console.error('Erro na API Together AI (curiosidade):', error);
    throw new Error('Falha ao gerar curiosidade: ' + error.message);
  }
}

// Função para gerar quiz da molécula
async function gerarQuiz(nomeComposto) {
  const prompt = `Analise o composto "${nomeComposto}" e crie 5 questões de múltipla escolha para estudantes brasileiros do ensino médio, seguindo estas diretrizes:

REQUISITOS OBRIGATÓRIOS:
- Traduza o nome para português brasileiro usando nomenclatura IUPAC oficial
- Use linguagem adequada para 14-17 anos, tom conversacional
- Contextualize apenas com situações brasileiras (agricultura, indústria, cotidiano)
- Escreva apenas em português - sem anglicismos ou termos estrangeiros
- Crie 4 alternativas por questão, apenas uma correta e plausível

TEMAS DAS 5 QUESTÕES (todas contextualizadas):
1. Nomenclatura: Nome IUPAC brasileiro, classificação, fórmula
2. Estrutura: Grupos funcionais, ligações químicas, polaridade
3. Propriedades: Solubilidade, pontos de fusão/ebulição, forças intermoleculares
4. Aplicações: Usos industriais, medicinais, cotidianos no Brasil
5. Reações: Transformações químicas típicas, produtos de reação

CONTEXTOS PRIORITÁRIOS:
Fertilizantes, medicamentos, alimentos, combustíveis, produtos de limpeza, cosméticos, indústria petroquímica brasileira, tratamento de água, agricultura nacional.

FORMATO DE RESPOSTA:
Nome em português: [tradução IUPAC]

Questão 1: [enunciado contextualizado brasileiro]
A) [alternativa]
B) [alternativa]
C) [alternativa]
D) [alternativa]
Resposta correta: [letra]

[Repetir para as 5 questões]

Crie questões instigantes que conectem a química teórica com aplicações práticas do dia a dia brasileiro.
`;

  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    });

    let perguntasTexto = response.data.choices?.[0]?.message?.content || "";
    
    // Verificar se as perguntas estão em inglês
    if (containsEnglishPhrases(perguntasTexto)) {
      console.warn('Perguntas em inglês detectadas, fazendo nova tentativa...');
      
      const retryPrompt = `${prompt}

REPITO: TODAS as perguntas e respostas devem ser em PORTUGUÊS BRASILEIRO. NÃO use inglês!`;
      
      const retryResponse = await togetherAPI.post('', {
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        messages: [{ role: "user", content: retryPrompt }],
        temperature: 0.7,
        max_tokens: 1000
      });
      
      perguntasTexto = retryResponse.data.choices?.[0]?.message?.content || perguntasTexto;
    }
    
    return processarPerguntas(perguntasTexto);
  } catch (error) {
    console.error('Erro na API Together AI (quiz):', error);
    throw new Error('Falha ao gerar quiz: ' + error.message);
  }
}

// Função para processar o texto das perguntas em formato estruturado
function processarPerguntas(texto) {
  if (!texto || typeof texto !== 'string') {
    console.warn('Texto vazio ou inválido para processamento de perguntas');
    return [];
  }

  try {
    // Dividir o texto em blocos de perguntas
    const blocos = texto.split(/Pergunta\s*\d+:/i).filter(b => b.trim());
    
    return blocos.map(bloco => {
      try {
        // Extrair o enunciado (primeira linha)
        const enunciadoMatch = bloco.match(/^(.*?)(?:\n|$)/);
        if (!enunciadoMatch) return null;
        
        // Extrair alternativas
        const alternativas = {};
        const alternativaRegex = /([A-D])\)\s*(.*?)(?=\s*(?:[A-D]\)|Resposta|$))/gs;
        
        let match;
        while ((match = alternativaRegex.exec(bloco)) !== null) {
          alternativas[match[1]] = match[2].trim();
        }
        
        // Se não encontrou alternativas, tentar abordagem linha por linha
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
          console.warn("Pergunta mal formatada:", {
            temEnunciado: !!enunciadoMatch,
            numAlternativas: Object.keys(alternativas).length,
            temResposta: !!respostaCorreta
          });
          return null;
        }

        return {
          enunciado: enunciadoMatch[1].trim(),
          alternativas: alternativas,
          correta: respostaCorreta
        };
      } catch (err) {
        console.error('Erro ao processar bloco de pergunta:', err);
        return null;
      }
    }).filter(Boolean); // Filtrar valores null
  } catch (err) {
    console.error('Erro geral no processamento de perguntas:', err);
    return [];
  }
}

// Funções auxiliares para detecção de idioma inglês
function containsEnglishPhrases(text) {
  if (!text || typeof text !== 'string') return false;
  
  const englishPhrases = [
    'this compound', 'the compound', 'is used', 'is a', 'it is', 
    'it can', 'is known', 'has been', 'was discovered', 'this molecule',
    'which is', 'that is', 'commonly used', 'important for'
  ];
  
  return englishPhrases.some(phrase => 
    text.toLowerCase().includes(phrase.toLowerCase())
  );
}

// Endpoint de health-check
router.get('/ping', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'IA Backend - Análise de Moléculas'
  });
});

export default router;
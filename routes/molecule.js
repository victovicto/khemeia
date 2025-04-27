import express from 'express';
import Molecule from '../models/molecula.js'; 
import autenticarToken from '../middleware/authid.js'; 

const router = express.Router();

// Rota para salvar uma molécula (token obrigatório)
router.post('/salvar-molecula', autenticarToken, async (req, res) => {
  const { name, molfile } = req.body;
  const usuarioId = req.usuarioId; // Agora vem do token!!

  if (!name || !molfile) {
    return res.status(400).send({ message: 'Nome ou Molfile faltando' });
  }

  const newMolecule = new Molecule({
    name,
    molfile,
    usuarioId, // Adiciona o usuário autenticado
  });

  try {
    const savedMolecule = await newMolecule.save();
    res.status(201).send(savedMolecule);
  } catch (error) {
    console.error('Erro ao salvar molécula:', error);
    res.status(500).send({ message: 'Erro ao salvar a molécula', error });
  }
});

// Rota para carregar uma molécula pelo ID (pode ser pública ou protegida, você escolhe)
router.get('/carregar-molecula/:id', async (req, res) => {
  try {
    const molecule = await Molecule.findById(req.params.id);
    if (!molecule) {
      return res.status(404).send({ message: 'Molécula não encontrada' });
    }
    res.status(200).send(molecule);
  } catch (error) {
    console.error('Erro ao carregar molécula:', error);
    res.status(500).send({ message: 'Erro ao carregar a molécula', error });
  }
});

// Rota para listar TODAS as moléculas do usuário logado (token obrigatório)
router.get('/moleculas-usuario', autenticarToken, async (req, res) => {
  const usuarioId = req.usuarioId; // Vem do token também

  try {
    const molecules = await Molecule.find({ usuarioId });
    res.status(200).send(molecules);
  } catch (error) {
    console.error('Erro ao buscar moléculas:', error);
    res.status(500).send({ message: 'Erro ao buscar moléculas do usuário', error });
  }
});

export default router;

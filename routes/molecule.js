import express from 'express';
import Molecule from '../models/molecule.js'; 

const router = express.Router();

// Rota para salvar uma molécula
router.post('/salvar-molecula', async (req, res) => {
  const { name, molfile } = req.body;

const newMolecule = new Molecule({
  name: name,
  molfile: molfile,
});


  try {
    const savedMolecule = await newMolecule.save();
    res.status(201).send(savedMolecule);
  } catch (error) {
    res.status(500).send({ message: 'Erro ao salvar a molécula', error });
  }
});

// Rota para carregar uma molécula pelo ID
router.get('/carregar-molecula/:id', async (req, res) => {
  try {
    const molecule = await Molecule.findById(req.params.id);
    if (!molecule) {
      return res.status(404).send({ message: 'Molécula não encontrada' });
    }
    res.status(200).send(molecule);
  } catch (error) {
    res.status(500).send({ message: 'Erro ao carregar a molécula', error });
  }
});

export default router;

import mongoose from 'mongoose';

const moleculeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  molfile: {
    type: String,
    required: true,
  },
});

const Molecule = mongoose.model('Molecule', moleculeSchema);

export default Molecule;

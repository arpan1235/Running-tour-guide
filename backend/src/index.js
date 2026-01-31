const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const tourRoutes = require('./routes/tour');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Running Tour Guide API is running' });
});

// Tour routes
app.use('/api/tour', tourRoutes);

app.listen(PORT, () => {
  console.log(`🏃 Running Tour Guide API listening on port ${PORT}`);
});

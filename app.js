const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:5000',
  credentials: true
}));
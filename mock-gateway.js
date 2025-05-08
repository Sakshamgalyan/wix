import express from 'express';

const app = express();
app.use(express.json());

// Mock payment endpoint
app.post('/mock/pay', (req, res) => {
  console.log("Received:", req.body);
  res.json({
    id: `mock_${Date.now()}`,
    url: "http://localhost:3000/mock-success"
  });
});

app.listen(4000, () => console.log("Mock gateway running on 4000"));
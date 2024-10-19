import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Hello from AI Agents!');
});

app.listen(port, () => {
    console.log(`AI Agents server listening at http://localhost:${port}`);
});

import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/hello/:name/:age', (req, res) => {
    const { name, age } = req.params;
    res.send(`Hello ${name} from AI Agents! You are ${age} years old.`);
});

app.listen(port, () => {
    console.log(`AI Agents server listening at http://localhost:${port}`);
});

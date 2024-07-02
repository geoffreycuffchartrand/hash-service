const express = require('express');

const app = express();
app.use(express.json());

const {
    createHash,
  } = require('node:crypto');
  
  const hash = createHash('sha256');

app.post('/', (req, res) => {
    hash.update(JSON.stringify(req.body));
    const HashedCred = hash.digest('hex');
    console.log(HashedCred);
    res.end(HashedCred);
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});
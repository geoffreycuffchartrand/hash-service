const express = require('express');

const app = express();
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://geoffreycuffchartrand:XwazPm2lDw50MFeD@cluster0.6oaecgd.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

const {
    createHash,
  } = require('node:crypto');

function jsonParserGetName(stringValue) {

    var string = JSON.stringify(stringValue);
    var objectValue = JSON.parse(string);
    return objectValue.menu.name;
}

async function bucketer() {
    try {
        await client.connect();
        var bucket = "";
        const db = client.db("hash_database");
        const coll = db.collection("hashes");
        const cursor = coll.find({});
        await cursor.stream().on("data", doc => bucket = bucket + doc.hash);
        return bucket;
    }
    finally {
        //Ensures that the client will close when you finish/error
        await client.close();
    }
}

async function run(name_data, hash_data) {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        const db = client.db("hash_database");
        const coll = db.collection("hashes");
        const docs = {name: name_data, hash: hash_data}; 
        const result = await coll.insertOne(docs);
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}

app.post('/', (req, res) => {
    const hash = createHash('sha256');
    hash.update(JSON.stringify(req.body));
    const hashedCred = hash.copy().digest('hex')
    const name_data = jsonParserGetName(req.body);
    console.log(hashedCred);
    res.end(hashedCred);
    run(name_data, hashedCred);
});



app.get('/', (err, res) => {
	bucketer().then(x => { 
        res.end(x); 
    });
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});
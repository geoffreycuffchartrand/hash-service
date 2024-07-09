const express = require('express');
const app = express();
app.use(express.json());
const fetch = require("node-fetch");

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
const verifiableCredential = require('./verifiableCredential.js');

function jsonParserGetName(stringValue) {

    var string = JSON.stringify(stringValue);
    var objectValue = JSON.parse(string);
    return objectValue.menu.name;
}

async function signer(hashlist) {
    const credential = {"credential": verifiableCredential.VC(hashlist), 
    "options": {"verificationMethod":"did:web:digitalcredentials.github.io#z6MkrXSQTybtqyMasfSxeRBJxDvDUGqb7mt9fFVXkVn6xTG7"}};
    const response = await fetch('http://localhost:4006/instance/testing/credentials/sign', {
	    method: 'post',
	    body: JSON.stringify(credential),
	    headers: {'Content-Type': 'application/json'}
    });
    const signedCred = await response.json();
    console.log("this is the signedCred:")
    console.log(signedCred)
    return signedCred;
}

async function bucketer() {
    try {
        await client.connect();
        var bucket = "";
        const db = client.db("hash_database");
        const coll = db.collection("hashes");
        const cursor = await coll.find({}, { hash: 1, _id: 0 });
        for await (const doc of cursor) {
            bucket = bucket + doc.hash + ", "
        }
        bucket = bucket.slice(0, -2); 
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
    const hashedCred = hash.copy().digest('hex');
    const name_data = jsonParserGetName(req.body);
    console.log(hashedCred);
    res.end(hashedCred);
    run(name_data, hashedCred);
});



app.get('/', async (err, res) => {
	const hashList = await bucketer();
    const result = await signer(hashList)
    res.end(JSON.stringify(result))
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});
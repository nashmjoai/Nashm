const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://nashm_user:As%240790796457%24%24@ac-pfh6v9j-shard-00-00.eweoxlx.mongodb.net:27017,ac-pfh6v9j-shard-00-01.eweoxlx.mongodb.net:27017,ac-pfh6v9j-shard-00-02.eweoxlx.mongodb.net:27017/nashm?ssl=true&replicaSet=atlas-ewcssy-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));
  
  const agents = await db.collection('agents').find({}).toArray();
  console.log('Found agents count:', agents.length);
  for (const agent of agents) {
    console.log(`Agent ID: ${agent.id}, Name: ${agent.name}, Provider: ${agent.provider}, Model: ${agent.model}`);
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

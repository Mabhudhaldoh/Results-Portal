require('dotenv').config({ path: __dirname + '/.env' });
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const db = client.db('MlkEportal');

  const collections = (await db.listCollections().toArray()).map(c => c.name);
  console.log('Collections:', collections.join(', '));
  console.log('');

  const targets = ['resources', 'events', 'notices', 'assignments', 'submissions', 'users'];
  for (const name of targets) {
    if (!collections.includes(name)) { console.log(`${name}: DOES NOT EXIST`); console.log(''); continue; }
    const count = await db.collection(name).countDocuments();
    const sample = await db.collection(name).findOne();
    const keys = sample ? Object.keys(sample) : [];
    console.log(`--- ${name} (${count} docs) ---`);
    console.log('  fields:', keys.join(', '));
    if (sample) {
      const uploadFields = {};
      for (const k of ['fileUrl', 'fileName', 'attachment', 'attachments', 'link']) {
        if (sample[k] !== undefined) uploadFields[k] = Array.isArray(sample[k]) ? `[${sample[k].length}]` : (typeof sample[k] === 'object' ? JSON.stringify(sample[k]) : sample[k]);
      }
      if (Object.keys(uploadFields).length) console.log('  upload fields on newest doc:', JSON.stringify(uploadFields));
      else console.log('  upload fields on newest doc: NONE');
    }
    console.log('');
  }

  const user = await db.collection('users').findOne();
  if (user) {
    const { password, ...rest } = user;
    console.log('Sample user (password hidden):', JSON.stringify(rest, null, 2).slice(0, 800));
  }

  await client.close();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

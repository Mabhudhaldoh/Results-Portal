const { getDB } = require("./db");
const { v4: uuidv4 } = require("uuid");


const database = {

    collection(name) {

        return {

            find(query = {}) {
                return getDB()
                    .collection(name)
                    .find(query)
                    .toArray();
            },

            findOne(query = {}) {
                return getDB()
                    .collection(name)
                    .findOne(query);
            },

            create(data) {
                const newDoc = {
                    ...data,
                    _id: data._id || uuidv4(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                return getDB()
                    .collection(name)
                    .insertOne(newDoc)
                    .then(() => newDoc);
            },

            insertMany(data) {
                const docs = data.map(item => ({
                    ...item,
                    _id: item._id || uuidv4(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }));
                return getDB()
                    .collection(name)
                    .insertMany(docs)
                    .then(() => docs);
            },

            findById(id) {
                return getDB()
                    .collection(name)
                    .findOne({ _id: id });
            },

            async findByIdAndUpdate(id, update) {
                await getDB()
                    .collection(name)
                    .updateOne(
                        { _id: id },
                        { $set: { ...update, updatedAt: new Date() } }
                    );
                return getDB()
                    .collection(name)
                    .findOne({ _id: id });
            },

            findByIdAndDelete(id) {
                return getDB()
                    .collection(name)
                    .findOneAndDelete({ _id: id })
                    .then(result => (result && result.value) ? result.value : result);
            },

            updateOne(filter, update) {
                return getDB()
                    .collection(name)
                    .updateOne(filter, { $set: update });
            },

            updateMany(filter, update) {
                return getDB()
                    .collection(name)
                    .updateMany(filter, { $set: update });
            },

            deleteOne(filter) {
                return getDB()
                    .collection(name)
                    .deleteOne(filter);
            },

            deleteMany(filter = {}) {
                return getDB()
                    .collection(name)
                    .deleteMany(filter);
            },

            aggregate(pipeline) {
                return getDB()
                    .collection(name)
                    .aggregate(pipeline)
                    .toArray();
            },

            countDocuments(query = {}) {
                return getDB()
                    .collection(name)
                    .countDocuments(query);
            },

            save(doc) {
                doc.updatedAt = new Date();
                return getDB()
                    .collection(name)
                    .replaceOne(
                        { _id: doc._id },
                        doc,
                        { upsert: true }
                    )
                    .then(() => doc);
            }

        };

    }

};


module.exports = database;

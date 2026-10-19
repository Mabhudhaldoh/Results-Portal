const db = require("../config/database");

exports.getClasses = async (req, res) => {
  try {
    let classes = await db.collection('classes').find();
    classes = await Promise.all(classes.map(async c => {
      const { password, ...rest } = c;
      rest.streams = (await Promise.all((rest.streams || []).map(id => db.collection('streams').findById(id)))).filter(Boolean);
      if (rest.classTeacher) rest.classTeacher = await db.collection('users').findById(rest.classTeacher) || null;
      return rest;
    }));
    res.json({ success: true, classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createClass = async (req, res) => {
  try {
    const cls = await db.collection('classes').create({ name: req.body.name, streams: [], classTeacher: req.body.classTeacher || null });
    if (req.body.streams && req.body.streams.length > 0) {
      const streamDocs = await Promise.all(req.body.streams.map(name =>
        db.collection('streams').create({ name, class: cls._id })
      ));
      cls.streams = streamDocs.map(s => s._id);
      await db.collection('classes').save(cls);
    }
    res.status(201).json({ success: true, cls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateClass = async (req, res) => {
  try {
    const cls = await db.collection('classes').findByIdAndUpdate(req.params.id, req.body);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    res.json({ success: true, cls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    await db.collection('streams').deleteMany({ class: req.params.id });
    await db.collection('classes').findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Class deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStreams = async (req, res) => {
  try {
    let streams = await db.collection('streams').find();
    streams = await Promise.all(streams.map(async s => {
      s.class = s.class ? await db.collection('classes').findById(s.class) : null;
      return s;
    }));
    res.json({ success: true, streams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createStream = async (req, res) => {
  try {
    const stream = await db.collection('streams').create(req.body);
    if (req.body.class) {
      const cls = await db.collection('classes').findById(req.body.class);
      if (cls) {
        cls.streams = cls.streams || [];
        cls.streams.push(stream._id);
        await db.collection('classes').save(cls);
      }
    }
    res.status(201).json({ success: true, stream });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

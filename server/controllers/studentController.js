const db = require("../config/database");
const bcrypt = require('bcryptjs');

exports.getStudents = async (req, res) => {
  try {
    const { className, stream, search, page = 1, limit = 50 } = req.query;
    let query = { role: 'student' };

    let students = await db.collection('users').find(query);

    if (className) students = students.filter(s => s.className === className);
    if (stream) students = students.filter(s => s.stream === stream);
    if (search) {
      const s = search.toLowerCase();
      students = students.filter(st =>
        (st.firstName && st.firstName.toLowerCase().includes(s)) ||
        (st.lastName && st.lastName.toLowerCase().includes(s)) ||
        (st.admissionNumber && st.admissionNumber.toLowerCase().includes(s))
      );
    }

    students = await Promise.all(students.map(async st => {
      const rest = { ...st };
      delete rest.password;
      rest.className = rest.className ? await db.collection('classes').findById(rest.className) : null;
      rest.stream = rest.stream ? await db.collection('streams').findById(rest.stream) : null;
      if (req.user.role === 'finance') {
        return {
          _id: rest._id,
          admissionNumber: rest.admissionNumber,
          firstName: rest.firstName,
          lastName: rest.lastName,
          className: rest.className ? { _id: rest.className._id, name: rest.className.name } : null,
          feesRequired: rest.feesRequired || 0,
          feesPaid: rest.feesPaid || 0,
          feesBalance: rest.feesBalance ?? Math.max(0, (rest.feesRequired || 0) - (rest.feesPaid || 0)),
          isActive: rest.isActive,
        };
      }
      return rest;
    }));

    const total = students.length;
    const start = (page - 1) * limit;
    students = students.slice(start, start + parseInt(limit));

    res.json({ success: true, students, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudent = async (req, res) => {
  try {
    const student = await db.collection('users').findById(req.params.id);
    if (!student || student.role !== 'student') return res.status(404).json({ success: false, message: 'Student not found' });
    const { password, ...rest } = student;
    rest.className = rest.className ? await db.collection('classes').findById(rest.className) : null;
    rest.stream = rest.stream ? await db.collection('streams').findById(rest.stream) : null;
    res.json({ success: true, student: rest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const hashedPassword = await bcrypt.hash(password || 'student123', 10);
    let defaultFee = 0;
    if (!rest.feesRequired) {
      const s = (await db.collection('settings').find())[0];
      defaultFee = s?.defaultFeesRequired || 0;
    }
    const student = await db.collection('users').create({ ...rest, password: hashedPassword, role: 'student', isActive: true, feesRequired: rest.feesRequired ?? defaultFee, feesPaid: rest.feesPaid ?? 0, feesBalance: (rest.feesRequired ?? defaultFee) - (rest.feesPaid ?? 0) });
    const { password: _, ...safeStudent } = student;
    res.status(201).json({ success: true, student: safeStudent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkCreateStudents = async (req, res) => {
  try {
    const { students } = req.body;
    const hashedPassword = await bcrypt.hash('student123', 10);
    const created = await db.collection('users').insertMany(students.map(s => ({ ...s, password: hashedPassword, role: 'student', isActive: true })));
    res.status(201).json({ success: true, count: created.length, students: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkQuickCreate = async (req, res) => {
  try {
    const { students } = req.body;
    const hashedPassword = await bcrypt.hash('student123', 10);
    const settingsArr = await db.collection('settings').find();
    const defaultFee = settingsArr[0]?.defaultFeesRequired || 0;
    const created = [];
    const errors = [];
    for (const s of students) {
      try {
        const student = await db.collection('users').create({ ...s, password: hashedPassword, role: 'student', isActive: true, feesRequired: s.feesRequired ?? defaultFee, feesPaid: s.feesPaid ?? 0, feesBalance: (s.feesRequired ?? defaultFee) - (s.feesPaid ?? 0) });
        const { password: _, ...safe } = student;
        created.push(safe);
      } catch (err) {
        errors.push({ row: s.admissionNumber, message: err.message });
      }
    }
    res.status(201).json({ success: true, created: created.length, errors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadExcelStudents = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    const hashedPassword = await bcrypt.hash('student123', 10);
    const created = [];
    const errors = [];
    for (const row of data) {
      try {
        const student = await db.collection('users').create({
          admissionNumber: row['Admission Number'] || row['admissionNumber'],
          firstName: row['First Name'] || row['firstName'],
          lastName: row['Last Name'] || row['lastName'],
          gender: row['Gender'] || row['gender'] || 'Male',
          email: row['Email'] || row['email'] || '',
          phone: row['Phone'] || row['phone'] || '',
          parentName: row['Parent Name'] || row['parentName'] || '',
          parentPhone: row['Parent Phone'] || row['parentPhone'] || '',
          className: row['Class'] || row['className'] || '',
          stream: row['Stream'] || row['stream'] || '',
          enrollmentYear: row['Year'] || row['enrollmentYear'] || new Date().getFullYear(),
          feesRequired: row['Fees Required'] || row['feesRequired'] || 0,
          feesPaid: row['Fees Paid'] || row['feesPaid'] || 0,
          feesBalance: row['Fees Balance'] || row['feesBalance'] || 0,
          password: hashedPassword, role: 'student', isActive: true,
        });
        created.push(student);
      } catch (err) {
        errors.push({ row: row['Admission Number'] || row['admissionNumber'], message: err.message });
      }
    }
    res.status(201).json({ success: true, created: created.length, errors, total: data.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

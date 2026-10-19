// @ts-nocheck
const DB_NAME = 'MlkEportal';
const DB_VERSION = 1;

const STORES = [
  'users', 'classes', 'streams', 'subjects', 'departments',
  'academicYears', 'gradings', 'results', 'settings', 'auditLogs', 'fees', 'feedback'
];

let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      STORES.forEach(name => {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: '_id' });
          if (name === 'users') {
            store.createIndex('email', 'email', { unique: true });
            store.createIndex('role', 'role', { unique: false });
            store.createIndex('admissionNumber', 'admissionNumber', { unique: true, multiEntry: false });
            store.createIndex('employeeNumber', 'employeeNumber', { unique: true, multiEntry: false });
          }
          if (name === 'results') {
            store.createIndex('student', 'student', { unique: false });
            store.createIndex('subject', 'subject', { unique: false });
            store.createIndex('teacher', 'teacher', { unique: false });
            store.createIndex('className', 'className', { unique: false });
            store.createIndex('status', 'status', { unique: false });
          }
        }
      });
    };
    request.onsuccess = (e) => { dbInstance = e.target.result; resolve(dbInstance); };
    request.onerror = (e) => reject(e.target.error);
  });
}

function genId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function tx(storeName, mode = 'readonly') {
  return dbInstance.transaction(storeName, mode).objectStore(storeName);
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function promisifyTx(storeName, mode, fn) {
  return new Promise(async (resolve, reject) => {
    await openDB();
    const transaction = dbInstance.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    try {
      const result = await fn(store);
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
    } catch (err) {
      reject(err);
    }
  });
}

const db = {
  async init() {
    await openDB();
    const count = await this.count('users');
    if (count === 0) {
      await this.seed();
    } else {
      await this.ensureCriticalUsers();
    }
  },

  async ensureCriticalUsers() {
    const hash = (pw) => {
      let h = 0;
      for (let i = 0; i < pw.length; i++) h = ((h << 5) - h + pw.charCodeAt(i)) | 0;
      return 'hashed_' + Math.abs(h).toString(36) + '_' + pw;
    };
    const users = await this.getAll('users');
    const emails = new Set(users.map(u => u.email));
    if (!emails.has('headmaster@mlkschools.ac.zw')) {
      await this.put('users', {
        _id: genId(), email: 'headmaster@mlkschools.ac.zw', password: hash('headmaster123'),
        firstName: 'Grace', lastName: 'Mandaza', role: 'headmaster',
        phone: '+263773333333', employeeNumber: 'HDM001', isActive: true,
        photo: '', gender: 'Female', assignedSubjects: [], assignedClasses: [],
      });
    }
    if (!emails.has('admin@mlkschools.ac.zw')) {
      await this.put('users', {
        _id: genId(), email: 'admin@mlkschools.ac.zw', password: hash('admin123'),
        firstName: 'System', lastName: 'Administrator', role: 'admin',
        phone: '+263770000000', employeeNumber: 'ADM001', isActive: true,
        photo: '', gender: 'Male', assignedSubjects: [], assignedClasses: [],
      });
    }
    if (!emails.has('finance@mlkschools.ac.zw')) {
      await this.put('users', {
        _id: genId(), email: 'finance@mlkschools.ac.zw', password: hash('finance123'),
        firstName: 'Tendai', lastName: 'Mhofu', role: 'finance',
        phone: '+263774444444', employeeNumber: 'FIN001', isActive: true,
        photo: '', gender: 'Male', assignedSubjects: [], assignedClasses: [],
      });
    }
  },

  async count(storeName) {
    await openDB();
    return promisifyTx(storeName, 'readonly', (store) => promisify(store.count()));
  },

  async getAll(storeName) {
    await openDB();
    return promisifyTx(storeName, 'readonly', (store) => promisify(store.getAll()));
  },

  async getById(storeName, id) {
    await openDB();
    return promisifyTx(storeName, 'readonly', (store) => promisify(store.get(id)));
  },

  async put(storeName, data) {
    await openDB();
    return promisifyTx(storeName, 'readwrite', (store) => promisify(store.put(data)));
  },

  async putMany(storeName, items) {
    await openDB();
    return promisifyTx(storeName, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        items.forEach(item => store.put(item));
        resolve();
      });
    });
  },

  async delete(storeName, id) {
    await openDB();
    return promisifyTx(storeName, 'readwrite', (store) => promisify(store.delete(id)));
  },

  async clear(storeName) {
    await openDB();
    return promisifyTx(storeName, 'readwrite', (store) => promisify(store.clear()));
  },

  async seed() {
    const hash = (pw) => {
      let h = 0;
      for (let i = 0; i < pw.length; i++) {
        h = ((h << 5) - h + pw.charCodeAt(i)) | 0;
      }
      return 'hashed_' + Math.abs(h).toString(36) + '_' + pw;
    };

    const departments = [
      { _id: genId(), name: 'Sciences' },
      { _id: genId(), name: 'Arts' },
      { _id: genId(), name: 'Commercials' },
    ];
    await this.putMany('departments', departments);

    const subjects = [
      { _id: genId(), name: 'Biology', code: 'BIO01', category: 'Sciences', department: departments[0]._id, teachers: [] },
      { _id: genId(), name: 'Chemistry', code: 'CHE01', category: 'Sciences', department: departments[0]._id, teachers: [] },
      { _id: genId(), name: 'Physics', code: 'PHY01', category: 'Sciences', department: departments[0]._id, teachers: [] },
      { _id: genId(), name: 'Computer Science', code: 'COM01', category: 'Sciences', department: departments[0]._id, teachers: [] },
      { _id: genId(), name: 'Pure Mathematics', code: 'MTH01', category: 'Sciences', department: departments[0]._id, teachers: [] },
      { _id: genId(), name: 'Geography', code: 'GEO01', category: 'Sciences', department: departments[0]._id, teachers: [] },
      { _id: genId(), name: 'Crop Science', code: 'CRP01', category: 'Sciences', department: departments[0]._id, teachers: [] },
      { _id: genId(), name: 'History', code: 'HIS01', category: 'Arts', department: departments[1]._id, teachers: [] },
      { _id: genId(), name: 'Literature in English', code: 'LIT01', category: 'Arts', department: departments[1]._id, teachers: [] },
      { _id: genId(), name: 'Family and Religious Studies', code: 'FRS01', category: 'Arts', department: departments[1]._id, teachers: [] },
      { _id: genId(), name: 'Sociology', code: 'SOC01', category: 'Arts', department: departments[1]._id, teachers: [] },
      { _id: genId(), name: 'Heritage Studies', code: 'HER01', category: 'Arts', department: departments[1]._id, teachers: [] },
      { _id: genId(), name: 'Economics', code: 'ECO01', category: 'Commercials', department: departments[2]._id, teachers: [] },
      { _id: genId(), name: 'Accounting', code: 'ACC01', category: 'Commercials', department: departments[2]._id, teachers: [] },
      { _id: genId(), name: 'Statistics', code: 'STA01', category: 'Commercials', department: departments[2]._id, teachers: [] },
      { _id: genId(), name: 'Business Studies', code: 'BUS01', category: 'Commercials', department: departments[2]._id, teachers: [] },
      { _id: genId(), name: 'Business Enterprise Skills', code: 'BES01', category: 'Commercials', department: departments[2]._id, teachers: [] },
    ];
    await this.putMany('subjects', subjects);

    const teacher1Id = genId();
    const teacher2Id = genId();
    const teacher1 = { _id: teacher1Id, email: 'teacher@mlkschools.ac.zw', password: hash('teacher123'), firstName: 'John', lastName: 'Moyo', role: 'teacher', employeeNumber: 'TCH001', phone: '+263771111111', isActive: true, assignedSubjects: [subjects[0]._id, subjects[1]._id], assignedClasses: [], photo: '', department: '', gender: 'Male' };
    const teacher2 = { _id: teacher2Id, email: 'teacher2@mlkschools.ac.zw', password: hash('teacher123'), firstName: 'Sarah', lastName: 'Nkomo', role: 'teacher', employeeNumber: 'TCH002', phone: '+263772222222', isActive: true, assignedSubjects: [subjects[7]._id, subjects[8]._id], assignedClasses: [], photo: '', department: '', gender: 'Female' };
    await this.put('users', teacher1);
    await this.put('users', teacher2);

    const classNames = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Lower Six', 'Upper Six'];
    const teacherIds = [teacher1Id, teacher2Id, null, null, null, null];
    const createdClasses = [];

    for (let i = 0; i < classNames.length; i++) {
      const classId = genId();
      const streamIds = [];
      for (const sn of ['A', 'B', 'C', 'D']) {
        const streamId = genId();
        await this.put('streams', { _id: streamId, name: sn, class: classId });
        streamIds.push(streamId);
      }
      const cls = { _id: classId, name: classNames[i], streams: streamIds, classTeacher: teacherIds[i] };
      await this.put('classes', cls);
      createdClasses.push(cls);
    }

    const yearId = genId();
    const termIds = [genId(), genId(), genId()];
    const year = {
      _id: yearId, name: '2026', isActive: true,
      terms: [
        { _id: termIds[0], name: 'Term 1', isActive: true, startDate: '2026-01-15', endDate: '2026-04-15' },
        { _id: termIds[1], name: 'Term 2', isActive: false, startDate: '2026-05-01', endDate: '2026-08-15' },
        { _id: termIds[2], name: 'Term 3', isActive: false, startDate: '2026-09-01', endDate: '2026-12-01' },
      ],
    };
    await this.put('academicYears', year);

    await this.put('gradings', {
      _id: genId(), name: 'Standard A-Level Grading', isActive: true,
      levels: [
        { grade: 'A', minMark: 80, maxMark: 100, points: 5, remark: 'Excellent' },
        { grade: 'B', minMark: 70, maxMark: 79, points: 4, remark: 'Very Good' },
        { grade: 'C', minMark: 60, maxMark: 69, points: 3, remark: 'Good' },
        { grade: 'D', minMark: 50, maxMark: 59, points: 2, remark: 'Satisfactory' },
        { grade: 'E', minMark: 40, maxMark: 49, points: 1, remark: 'Acceptable' },
        { grade: 'U', minMark: 0, maxMark: 39, points: 0, remark: 'Unsatisfactory' },
      ],
    });

    await this.put('settings', {
      _id: 'default', schoolName: "Martin Luther King Jnr. Family of Schools",
      schoolMotto: "Excellence in Education", currentAcademicYear: yearId, currentTerm: 'Term 1',
      termWeight: 30, examWeight: 50, projectWeight: 20,
      schoolAddress: '', schoolPhone: '', schoolEmail: '', schoolWebsite: '',
      headmasterName: '', schoolLogo: '',
      feesBlockingEnabled: true,
      feesViewPercentage: 50,
      defaultFeesRequired: 500,
      reportTemplate: { primaryColor: '#B91C1C', secondaryColor: '#1E40AF', accentColor: '#FFFFFF' },
    });

    const adminId = genId();
    await this.put('users', {
      _id: adminId, email: 'admin@mlkschools.ac.zw', password: hash('admin123'),
      firstName: 'System', lastName: 'Administrator', role: 'admin',
      phone: '+263770000000', employeeNumber: 'ADM001', isActive: true,
      photo: '', gender: 'Male', assignedSubjects: [], assignedClasses: [],
    });

    await this.put('users', {
      _id: genId(), email: 'headmaster@mlkschools.ac.zw', password: hash('headmaster123'),
      firstName: 'Grace', lastName: 'Mandaza', role: 'headmaster',
      phone: '+263773333333', employeeNumber: 'HDM001', isActive: true,
      photo: '', gender: 'Female', assignedSubjects: [], assignedClasses: [],
    });

    await this.put('users', {
      _id: genId(), email: 'finance@mlkschools.ac.zw', password: hash('finance123'),
      firstName: 'Tendai', lastName: 'Mhofu', role: 'finance',
      phone: '+263774444444', employeeNumber: 'FIN001', isActive: true,
      photo: '', gender: 'Male', assignedSubjects: [], assignedClasses: [],
    });

    const studentNames = [
      { an: 'MLK2026001', fn: 'Tendai', ln: 'Muparutsa', g: 'Male' },
      { an: 'MLK2026002', fn: 'Chiedza', ln: 'Chakanyuka', g: 'Female' },
      { an: 'MLK2026003', fn: 'Tinashe', ln: 'Moyo', g: 'Male' },
      { an: 'MLK2026004', fn: 'Rumbidzai', ln: 'Ndhlovu', g: 'Female' },
      { an: 'MLK2026005', fn: 'Blessing', ln: 'Sigobe', g: 'Male' },
      { an: 'MLK2026006', fn: 'Anesu', ln: 'Chigwada', g: 'Female' },
      { an: 'MLK2026007', fn: 'Kudakwashe', ln: 'Chikwanha', g: 'Male' },
      { an: 'MLK2026008', fn: 'Tatenda', ln: 'Gondo', g: 'Female' },
      { an: 'MLK2026009', fn: 'Farai', ln: 'Makunike', g: 'Male' },
      { an: 'MLK2026010', fn: 'Nyasha', ln: 'Mudavanhu', g: 'Female' },
    ];

    for (const s of studentNames) {
      await this.put('users', {
        _id: genId(), email: `${s.an.toLowerCase()}@mlkschools.ac.zw`, password: hash('student123'),
        firstName: s.fn, lastName: s.ln, role: 'student', gender: s.g,
        admissionNumber: s.an, phone: '', parentName: `Parent of ${s.fn}`,
        parentPhone: '+263770000000', address: '', isActive: true,
        className: createdClasses[0]._id, stream: createdClasses[0].streams[0],
        enrollmentYear: 2026, assignedSubjects: [], assignedClasses: [],
        dateOfBirth: '', nationalId: '', photo: '',
        feesPaid: 0, feesRequired: 500, feesBalance: 500,
      });
    }

    console.log('IndexedDB seeded successfully');
  },

  // Auth
  async login(emailOrAdm, password, isStudent = false) {
    const users = await this.getAll('users');
    let user;
    if (isStudent) {
      user = users.find(u => u.admissionNumber === emailOrAdm && u.role === 'student');
    } else {
      user = users.find(u => u.email === emailOrAdm.toLowerCase());
    }
    if (!user) return { success: false, message: 'Invalid credentials' };
    if (!user.isActive) return { success: false, message: 'Account is disabled' };
    const hashedPw = user.password;
    let h = 0;
    for (let i = 0; i < password.length; i++) {
      h = ((h << 5) - h + password.charCodeAt(i)) | 0;
    }
    const checkHash = 'hashed_' + Math.abs(h).toString(36) + '_' + password;
    if (checkHash !== hashedPw) return { success: false, message: 'Invalid credentials' };

    await this.put('auditLogs', { _id: genId(), user: user._id, action: 'LOGIN', details: `${user.firstName} ${user.lastName} logged in`, createdAt: new Date().toISOString() });

    const { password: _, ...safeUser } = user;
    return { success: true, token: 'local_' + user._id, user: safeUser };
  },

  async getMe(userId) {
    const user = await this.getById('users', userId);
    if (!user) return null;
    const { password, ...rest } = user;
    if (rest.className) rest.className = await this.getById('classes', rest.className) || rest.className;
    if (rest.stream) rest.stream = await this.getById('streams', rest.stream) || rest.stream;
    if (rest.classTeacher) rest.classTeacher = await this.getById('classes', rest.classTeacher) || rest.classTeacher;
    if (rest.assignedClasses && Array.isArray(rest.assignedClasses)) {
      rest.assignedClasses = (await Promise.all(rest.assignedClasses.map(id => this.getById('classes', id)))).filter(Boolean);
    }
    if (rest.assignedSubjects && Array.isArray(rest.assignedSubjects)) {
      rest.assignedSubjects = (await Promise.all(rest.assignedSubjects.map(id => this.getById('subjects', id)))).filter(Boolean);
    }
    return rest;
  },

  async changePassword(userId, newPassword) {
    const user = await this.getById('users', userId);
    if (!user) return null;
    let h = 0;
    for (let i = 0; i < newPassword.length; i++) {
      h = ((h << 5) - h + newPassword.charCodeAt(i)) | 0;
    }
    user.password = 'hashed_' + Math.abs(h).toString(36) + '_' + newPassword;
    await this.put('users', user);
    return true;
  },

  // Generic CRUD
  async getUsers(role, search) {
    let users = await this.getAll('users');
    if (role) users = users.filter(u => u.role === role);
    if (search) {
      const s = search.toLowerCase();
      users = users.filter(u =>
        (u.firstName && u.firstName.toLowerCase().includes(s)) ||
        (u.lastName && u.lastName.toLowerCase().includes(s)) ||
        (u.email && u.email.toLowerCase().includes(s)) ||
        (u.admissionNumber && u.admissionNumber.toLowerCase().includes(s)) ||
        (u.employeeNumber && u.employeeNumber.toLowerCase().includes(s))
      );
    }
    return Promise.all(users.map(async u => {
      const { password, ...rest } = u;
      if (rest.className && typeof rest.className === 'string') rest.className = await this.getById('classes', rest.className);
      if (rest.stream && typeof rest.stream === 'string') rest.stream = await this.getById('streams', rest.stream);
      if (rest.assignedSubjects && Array.isArray(rest.assignedSubjects)) rest.assignedSubjects = (await Promise.all(rest.assignedSubjects.map(id => this.getById('subjects', id)))).filter(Boolean);
      if (rest.assignedClasses && Array.isArray(rest.assignedClasses)) rest.assignedClasses = (await Promise.all(rest.assignedClasses.map(id => this.getById('classes', id)))).filter(Boolean);
      return rest;
    }));
  },

  async createUser(data) {
    const { password, ...rest } = data;
    let h = 0;
    const pw = password || 'password123';
    for (let i = 0; i < pw.length; i++) h = ((h << 5) - h + pw.charCodeAt(i)) | 0;
    const user = { _id: genId(), ...rest, password: 'hashed_' + Math.abs(h).toString(36) + '_' + pw, isActive: true, createdAt: new Date().toISOString() };
    await this.put('users', user);
    const { password: _, ...safe } = user;
    return safe;
  },

  async updateUser(id, data) {
    const { password, ...rest } = data;
    const user = await this.getById('users', id);
    if (!user) return null;
    Object.assign(user, rest);
    await this.put('users', user);
    const { password: _, ...safe } = user;
    return safe;
  },

  async deleteUser(id) { await this.delete('users', id); },
  async toggleActive(id) {
    const user = await this.getById('users', id);
    if (!user) return null;
    user.isActive = !user.isActive;
    await this.put('users', user);
    return user;
  },
  async resetPassword(id) {
    const user = await this.getById('users', id);
    if (!user) return null;
    let h = 0;
    const pw = 'password123';
    for (let i = 0; i < pw.length; i++) h = ((h << 5) - h + pw.charCodeAt(i)) | 0;
    user.password = 'hashed_' + Math.abs(h).toString(36) + '_' + pw;
    await this.put('users', user);
    return true;
  },

  // Students
  async getStudents(className, stream, search) {
    let students = (await this.getAll('users')).filter(u => u.role === 'student');
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
    return Promise.all(students.map(async st => {
      const { password, ...rest } = st;
      if (rest.className) rest.className = await this.getById('classes', rest.className) || null;
      if (rest.stream) rest.stream = await this.getById('streams', rest.stream) || null;
      return rest;
    }));
  },

  async getStudent(id) {
    const student = await this.getById('users', id);
    if (!student || student.role !== 'student') return null;
    const { password, ...rest } = student;
    if (rest.className) rest.className = await this.getById('classes', rest.className) || null;
    if (rest.stream) rest.stream = await this.getById('streams', rest.stream) || null;
    return rest;
  },

  // Teachers
  async getTeachers(search) {
    let teachers = (await this.getAll('users')).filter(u => u.role === 'teacher' || u.role === 'headmaster' || u.role === 'finance');
    if (search) {
      const s = search.toLowerCase();
      teachers = teachers.filter(t =>
        (t.firstName && t.firstName.toLowerCase().includes(s)) ||
        (t.lastName && t.lastName.toLowerCase().includes(s)) ||
        (t.employeeNumber && t.employeeNumber.toLowerCase().includes(s))
      );
    }
    return Promise.all(teachers.map(async t => {
      const { password, ...rest } = t;
      if (rest.assignedSubjects) rest.assignedSubjects = (await Promise.all(rest.assignedSubjects.map(id => this.getById('subjects', id)))).filter(Boolean);
      if (rest.assignedClasses) rest.assignedClasses = (await Promise.all(rest.assignedClasses.map(id => this.getById('classes', id)))).filter(Boolean);
      return rest;
    }));
  },

  // Classes
  async getClasses() {
    const classes = await this.getAll('classes');
    return Promise.all(classes.map(async c => {
      const { password, ...rest } = c;
      if (rest.streams) rest.streams = (await Promise.all(rest.streams.map(id => this.getById('streams', id)))).filter(Boolean);
      if (rest.classTeacher) rest.classTeacher = await this.getById('users', rest.classTeacher) || null;
      if (rest.classTeacher && rest.classTeacher.password) delete rest.classTeacher.password;
      return rest;
    }));
  },

  async createClass(data) {
    const classId = genId();
    const streamIds = [];
    if (data.streams && data.streams.length > 0) {
      for (const name of data.streams) {
        const streamId = genId();
        await this.put('streams', { _id: streamId, name, class: classId });
        streamIds.push(streamId);
      }
    }
    const cls = { _id: classId, name: data.name, streams: streamIds, classTeacher: data.classTeacher || null };
    await this.put('classes', cls);
    return cls;
  },

  async deleteClass(id) {
    const streams = await this.getAll('streams');
    for (const s of streams) { if (s.class === id) await this.delete('streams', s._id); }
    await this.delete('classes', id);
  },

  // Subjects
  async getSubjects(category) {
    let subjects = await this.getAll('subjects');
    if (category) subjects = subjects.filter(s => s.category === category);
    return Promise.all(subjects.map(async s => {
      if (s.teachers) s.teachers = (await Promise.all(s.teachers.map(async id => {
        const t = await this.getById('users', id);
        return t ? { _id: t._id, firstName: t.firstName, lastName: t.lastName } : null;
      }))).filter(Boolean);
      if (s.department) s.department = await this.getById('departments', s.department) || null;
      return s;
    }));
  },

  // Departments
  async getDepartments() {
    const depts = await this.getAll('departments');
    return Promise.all(depts.map(async d => {
      if (d.head) d.head = await this.getById('users', d.head) || null;
      return d;
    }));
  },

  // Academic Years
  async getAcademicYears() { return (await this.getAll('academicYears')).sort((a, b) => (b.name || '').localeCompare(a.name || '')); },

  async createAcademicYear(data) { const y = { _id: genId(), ...data }; await this.put('academicYears', y); return y; },

  async setActiveYear(id) {
    const years = await this.getAll('academicYears');
    for (const y of years) { y.isActive = false; await this.put('academicYears', y); }
    const year = await this.getById('academicYears', id);
    if (year) { year.isActive = true; await this.put('academicYears', year); }
  },

  async addTerm(yearId, termData) {
    const year = await this.getById('academicYears', yearId);
    if (!year) return null;
    year.terms = year.terms || [];
    year.terms.push({ _id: genId(), ...termData });
    await this.put('academicYears', year);
    return year;
  },

  // Grading
  async getGradings() { return (await this.getAll('gradings')).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)); },

  async createGrading(data) {
    if (data.isActive) {
      const all = await this.getAll('gradings');
      for (const g of all) { g.isActive = false; await this.put('gradings', g); }
    }
    const g = { _id: genId(), ...data };
    await this.put('gradings', g);
    return g;
  },

  async applyGrading(id) {
    const grading = await this.getById('gradings', id);
    if (!grading) return false;
    const results = await this.getAll('results');
    for (const r of results) {
      const level = grading.levels.find(l => r.finalMark >= l.minMark && r.finalMark <= l.maxMark);
      if (level) {
        r.grade = level.grade;
        r.points = level.points;
        r.gradeRemark = level.remark || '';
        await this.put('results', r);
      }
    }
    return true;
  },

  // Results
  async calcFinalMark(termMark, examMark, projectMark) {
    const settings = await this.getSettings();
    const tw = (settings?.termWeight || 30) / 100;
    const ew = (settings?.examWeight || 50) / 100;
    const pw = (settings?.projectWeight || 20) / 100;
    return Math.round(((termMark || 0) * tw + (examMark || 0) * ew + (projectMark || 0) * pw) * 100) / 100;
  },

  async applyGrade(finalMark) {
    const gradings = (await this.getAll('gradings')).filter(g => g.isActive);
    if (gradings.length === 0) return { grade: '', points: 0, gradeRemark: '' };
    const level = gradings[0].levels.find(l => finalMark >= l.minMark && finalMark <= l.maxMark);
    if (level) return { grade: level.grade, points: level.points, gradeRemark: level.remark || '' };
    return { grade: '', points: 0, gradeRemark: '' };
  },

  async getResults(filters = {}) {
    let results = await this.getAll('results');
    if (filters.student) results = results.filter(r => r.student === filters.student);
    if (filters.className) results = results.filter(r => r.className === filters.className);
    if (filters.subject) results = results.filter(r => r.subject === filters.subject);
    if (filters.academicYear) results = results.filter(r => r.academicYear === filters.academicYear);
    if (filters.term) results = results.filter(r => r.term === filters.term);
    if (filters.status) results = results.filter(r => r.status === filters.status);
    if (filters.teacher) results = results.filter(r => r.teacher === filters.teacher);

    return Promise.all(results.map(async r => {
      const out = { ...r };
      out.student = await this.getById('users', r.student) || { firstName: '?', lastName: '?', admissionNumber: '?' };
      out.subject = await this.getById('subjects', r.subject) || { name: '?', code: '?' };
      out.teacher = await this.getById('users', r.teacher) || { firstName: '?', lastName: '?' };
      out.className = await this.getById('classes', r.className) || { name: '?' };
      out.stream = r.stream ? await this.getById('streams', r.stream) : null;
      out.academicYear = await this.getById('academicYears', r.academicYear) || { name: '?' };
      if (out.student && out.student.password) delete out.student.password;
      if (out.teacher && out.teacher.password) delete out.teacher.password;
      return out;
    }));
  },

  async createResult(data, teacherId) {
    const existing = (await this.getAll('results')).find(r =>
      r.student === data.student && r.subject === data.subject &&
      r.academicYear === data.academicYear && r.term === data.term
    );
    if (existing) return { success: false, message: 'Result already exists' };
    const finalMark = await this.calcFinalMark(data.termMark, data.examMark, data.projectMark);
    const gradeInfo = await this.applyGrade(finalMark);
    const result = { _id: genId(), ...data, teacher: teacherId, finalMark, ...gradeInfo, status: 'draft', createdAt: new Date().toISOString() };
    await this.put('results', result);
    return { success: true, result };
  },

  async bulkCreateResults(resultsData, teacherId) {
    const created = [];
    const errors = [];
    for (const r of resultsData) {
      const existing = (await this.getAll('results')).find(res =>
        res.student === r.student && res.subject === r.subject &&
        res.academicYear === r.academicYear && res.term === r.term
      );
      if (existing) { errors.push({ student: r.student, message: 'Already exists' }); continue; }
      const finalMark = await this.calcFinalMark(r.termMark, r.examMark, r.projectMark);
      const gradeInfo = await this.applyGrade(finalMark);
      const result = { _id: genId(), ...r, teacher: teacherId, finalMark, ...gradeInfo, status: 'draft', createdAt: new Date().toISOString() };
      await this.put('results', result);
      created.push(result);
    }
    return { created: created.length, errors };
  },

  async updateResult(id, data) {
    const result = await this.getById('results', id);
    if (!result) return null;
    if (result.status === 'locked') return { locked: true };
    Object.assign(result, data);
    result.finalMark = await this.calcFinalMark(result.termMark, result.examMark, result.projectMark);
    const gradeInfo = await this.applyGrade(result.finalMark);
    Object.assign(result, gradeInfo);
    await this.put('results', result);
    return result;
  },

  async publishResults(ids) {
    for (const id of ids) {
      const r = await this.getById('results', id);
      if (r) { r.status = 'published'; await this.put('results', r); }
    }
  },

  async lockResults(ids) {
    for (const id of ids) {
      const r = await this.getById('results', id);
      if (r) { r.status = 'locked'; await this.put('results', r); }
    }
  },

  async unlockResults(ids) {
    for (const id of ids) {
      const r = await this.getById('results', id);
      if (r) { r.status = 'submitted'; await this.put('results', r); }
    }
  },

  async hideResults(ids) {
    for (const id of ids) {
      const r = await this.getById('results', id);
      if (r) { r.status = 'hidden'; await this.put('results', r); }
    }
  },

  async deleteResult(id) {
    const r = await this.getById('results', id);
    if (r && r.status === 'locked') return false;
    await this.delete('results', id);
    return true;
  },

  // Bulk Student Operations
  async bulkCreateStudents(studentsData) {
    const created = [];
    const errors = [];
    const existingStudents = await this.getAll('users');
    const existingEmails = new Set(existingStudents.map(u => u.email).filter(Boolean));
    const existingAdmNos = new Set(existingStudents.filter(u => u.role === 'student').map(u => u.admissionNumber).filter(Boolean));
    const classes = await this.getAll('classes');
    const classMap = {};
    classes.forEach(c => { classMap[c.name.toLowerCase().trim()] = c._id; });
    const classStreamMap = {};
    classes.forEach(c => { classStreamMap[c.name.toLowerCase().trim()] = c.streams || []; });
    let admCounter = existingStudents.filter(u => u.role === 'student').length;

    for (const s of studentsData) {
      const admNo = (s.admissionNumber || '').trim();
      const firstName = (s.firstName || '').trim();
      const lastName = (s.lastName || '').trim();
      const className = (s.className || '').trim();

      if (!admNo || !firstName || !lastName || !className) {
        errors.push({ row: s.row || '?', message: 'Missing required fields (admissionNumber, firstName, lastName, className)' });
        continue;
      }
      if (existingAdmNos.has(admNo)) {
        errors.push({ row: s.row || admNo, message: `Admission number ${admNo} already exists` });
        continue;
      }
      const classId = classMap[className.toLowerCase()];
      if (!classId) {
        errors.push({ row: s.row || admNo, message: `Class "${className}" not found. Use: ${classes.map(c => c.name).join(', ')}` });
        continue;
      }
      const gender = (s.gender || 'Male').trim();
      const email = s.email ? s.email.trim() : `${admNo.toLowerCase()}@mlkschools.ac.zw`;
      if (existingEmails.has(email)) {
        errors.push({ row: s.row || admNo, message: `Email ${email} already exists` });
        continue;
      }

      const streams = classStreamMap[className.toLowerCase()] || [];
      const streamId = streams.length > 0 ? streams[admCounter % streams.length] : null;
      admCounter++;

      let h = 0;
      const pw = 'student123';
      for (let i = 0; i < pw.length; i++) h = ((h << 5) - h + pw.charCodeAt(i)) | 0;

      const student = {
        _id: genId(),
        email,
        password: 'hashed_' + Math.abs(h).toString(36) + '_' + pw,
        firstName, lastName, role: 'student', gender,
        admissionNumber: admNo,
        phone: s.phone || '', parentName: s.parentName || '',
        parentPhone: s.parentPhone || '', address: s.address || '',
        isActive: true, className: classId, stream: streamId,
        enrollmentYear: s.enrollmentYear || 2026,
        assignedSubjects: [], assignedClasses: [],
        dateOfBirth: s.dateOfBirth || '', nationalId: s.nationalId || '',
        photo: '', feesPaid: 0, feesRequired: 500, feesBalance: 500,
      };
      await this.put('users', student);
      existingEmails.add(email);
      existingAdmNos.add(admNo);
      created.push({ _id: student._id, admissionNumber: admNo, firstName, lastName });
    }
    return { created: created.length, errors };
  },

  // Dashboard
  async getDashboard(userRole, userId) {
    const users = await this.getAll('users');
    const results = await this.getAll('results');
    const classes = await this.getAll('classes');
    const subjects = await this.getAll('subjects');
    const years = await this.getAll('academicYears');

    const activeYear = years.find(y => y.isActive);
    let currentTerm = '';
    if (activeYear && activeYear.terms) {
      const activeT = activeYear.terms.find(t => t.isActive);
      if (activeT) currentTerm = activeT.name;
    }

    const published = results.filter(r => r.status === 'published');
    const studentPublished = userRole === 'student' ? published.filter(r => r.student === userId) : published;
    const avgMark = studentPublished.length > 0 ? studentPublished.reduce((s, r) => s + (r.finalMark || 0), 0) / studentPublished.length : 0;
    const passRate = studentPublished.length > 0 ? Math.round(studentPublished.filter(r => r.finalMark >= 50).length / studentPublished.length * 100) : 0;

    let recentPopulated: any[] = [];
    let recentResultsData: any[] = [];
    if (userRole === 'student') {
      recentResultsData = results.filter(r => r.student === userId && r.status === 'published').sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 10);
      recentPopulated = await Promise.all(recentResultsData.map(async r => ({
        ...r,
        subject: await this.getById('subjects', r.subject) || { name: '?' },
      })));
    } else {
      recentResultsData = results.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 10);
      recentPopulated = await Promise.all(recentResultsData.map(async r => ({
        ...r,
        student: await this.getById('users', r.student) || { firstName: '?', lastName: '?' },
        subject: await this.getById('subjects', r.subject) || { name: '?' },
      })));
    }

    let studentResults = [];
    if (userRole === 'student') {
      studentResults = results.filter(r => r.student === userId && r.status === 'published').slice(0, 10);
      studentResults = await Promise.all(studentResults.map(async r => ({ ...r, subject: await this.getById('subjects', r.subject) || null })));
    }

    let teacherResults = [];
    if (userRole === 'teacher') {
      teacherResults = results.filter(r => r.teacher === userId && (r.status === 'draft' || r.status === 'submitted')).slice(0, 10);
    }

    let pendingApprovals = 0;
    if (userRole === 'headmaster') {
      pendingApprovals = results.filter(r => r.status === 'submitted').length;
    }

    return {
      totalStudents: users.filter(u => u.role === 'student' && u.isActive).length,
      totalTeachers: users.filter(u => (u.role === 'teacher' || u.role === 'headmaster') && u.isActive).length,
      publishedResults: published.length,
      pendingResults: results.filter(r => r.status === 'draft' || r.status === 'submitted').length,
      pendingApprovals,
      totalClasses: classes.length, totalSubjects: subjects.length,
      currentTerm, currentAcademicYear: activeYear ? activeYear.name : '',
      averageMark: Math.round(avgMark * 100) / 100, passRate,
      recentResults: recentPopulated, teacherResults, studentResults,
    };
  },

  // Reports
  async getStudentReport(userId, academicYear, term) {
    const student = await this.getStudent(userId);
    if (!student) return null;
    const settings = await this.getById('settings', 'default');
    let results = (await this.getAll('results')).filter(r => r.student === userId && r.status === 'published');
    if (academicYear) results = results.filter(r => r.academicYear === academicYear);
    if (term) results = results.filter(r => r.term === term);

    results = await Promise.all(results.map(async r => ({
      ...r,
      subject: await this.getById('subjects', r.subject) || null,
      teacher: await this.getById('users', r.teacher) || null,
    })));

    const totalMarks = results.reduce((sum, r) => sum + (r.finalMark || 0), 0);
    const average = results.length > 0 ? Math.round((totalMarks / results.length) * 100) / 100 : 0;

    let position = null;
    if (student.className && student.className._id) {
      const allResults = (await this.getAll('results')).filter(r => r.className === student.className._id && r.status === 'published');
      const studentAvgs = {};
      allResults.forEach(r => {
        if (!studentAvgs[r.student]) studentAvgs[r.student] = { total: 0, count: 0 };
        studentAvgs[r.student].total += r.finalMark || 0;
        studentAvgs[r.student].count++;
      });
      const ranked = Object.entries(studentAvgs).map(([id, data]) => ({ id, avg: data.total / data.count })).sort((a, b) => b.avg - a.avg);
      position = ranked.findIndex(s => s.id === userId) + 1 || null;
    }

    return { student, results, average, position, settings, academicYear, term };
  },

  async getClassReport(className, academicYear, term) {
    let results = (await this.getAll('results')).filter(r => r.className === className && r.status === 'published');
    if (academicYear) results = results.filter(r => r.academicYear === academicYear);
    if (term) results = results.filter(r => r.term === term);

    const perf = {};
    results.forEach(r => {
      if (!perf[r.student]) perf[r.student] = { totalMark: 0, count: 0 };
      perf[r.student].totalMark += r.finalMark || 0;
      perf[r.student].count++;
    });

    const performance = await Promise.all(Object.entries(perf).map(async ([sid, p]) => {
      const user = await this.getById('users', sid);
      return { student: user ? { _id: user._id, firstName: user.firstName, lastName: user.lastName, admissionNumber: user.admissionNumber } : { _id: sid }, totalMark: p.totalMark, count: p.count, average: p.count > 0 ? Math.round((p.totalMark / p.count) * 100) / 100 : 0 };
    }));
    performance.sort((a, b) => b.average - a.average);
    performance.forEach((p, i) => p.position = i + 1);

    return { performance, totalResults: results.length };
  },

  async getSubjectReport(subject, academicYear, term) {
    let results = (await this.getAll('results')).filter(r => r.subject === subject && r.status === 'published');
    if (academicYear) results = results.filter(r => r.academicYear === academicYear);
    if (term) results = results.filter(r => r.term === term);
    results = await Promise.all(results.map(async r => ({
      ...r,
      student: await this.getById('users', r.student) || null,
      className: await this.getById('classes', r.className) || null,
    })));
    const avg = results.length > 0 ? results.reduce((s, r) => s + (r.finalMark || 0), 0) / results.length : 0;
    const passRate = results.length > 0 ? Math.round(results.filter(r => r.finalMark >= 50).length / results.length * 100) : 0;
    return { results, average: Math.round(avg * 100) / 100, passRate, totalStudents: results.length };
  },

  async getTopStudents(academicYear, term, limit = 10) {
    let results = (await this.getAll('results')).filter(r => r.status === 'published');
    if (academicYear) results = results.filter(r => r.academicYear === academicYear);
    if (term) results = results.filter(r => r.term === term);
    const avgs = {};
    results.forEach(r => {
      if (!avgs[r.student]) avgs[r.student] = { total: 0, count: 0 };
      avgs[r.student].total += r.finalMark || 0;
      avgs[r.student].count++;
    });
    const ranked = await Promise.all(Object.entries(avgs).map(async ([id, data]) => {
      const user = await this.getById('users', id);
      return { _id: user ? { _id: user._id, firstName: user.firstName, lastName: user.lastName, admissionNumber: user.admissionNumber } : { _id: id }, avgMark: data.count > 0 ? data.total / data.count : 0, totalSubjects: data.count };
    }));
    ranked.sort((a, b) => b.avgMark - a.avgMark);
    return ranked.slice(0, limit);
  },

  async getAnalytics(academicYear, term) {
    let results = (await this.getAll('results')).filter(r => r.status === 'published');
    if (academicYear) results = results.filter(r => r.academicYear === academicYear);
    if (term) results = results.filter(r => r.term === term);
    const avg = results.length > 0 ? results.reduce((s, r) => s + (r.finalMark || 0), 0) / results.length : 0;
    const min = results.length > 0 ? Math.min(...results.map(r => r.finalMark || 0)) : 0;
    const max = results.length > 0 ? Math.max(...results.map(r => r.finalMark || 0)) : 0;

    const subjMap = {};
    results.forEach(r => { if (!subjMap[r.subject]) subjMap[r.subject] = { total: 0, count: 0 }; subjMap[r.subject].total += r.finalMark || 0; subjMap[r.subject].count++; });
    const subjectPerformance = await Promise.all(Object.entries(subjMap).map(async ([id, data]) => ({ _id: id, avgMark: data.count > 0 ? data.total / data.count : 0, count: data.count, subject: await this.getById('subjects', id) || { name: 'Unknown' } })));
    subjectPerformance.sort((a, b) => b.avgMark - a.avgMark);

    const classMap = {};
    results.forEach(r => { if (!classMap[r.className]) classMap[r.className] = { total: 0, count: 0 }; classMap[r.className].total += r.finalMark || 0; classMap[r.className].count++; });
    const classPerformance = await Promise.all(Object.entries(classMap).map(async ([id, data]) => ({ _id: id, avgMark: data.count > 0 ? data.total / data.count : 0, count: data.count, className: await this.getById('classes', id) || { name: 'Unknown' } })));

    const gradeMap = {};
    results.forEach(r => { const g = r.grade || 'N/A'; gradeMap[g] = (gradeMap[g] || 0) + 1; });
    const gradeDistribution = Object.entries(gradeMap).map(([grade, count]) => ({ _id: grade, count }));

    return { totalResults: results.length, summary: { avg: Math.round(avg * 100) / 100, min, max }, subjectPerformance, classPerformance, gradeDistribution };
  },

  // Fees
  async recordPayment(data) {
    const payment = { _id: genId(), studentId: data.studentId, amount: data.amount, method: data.method, reference: data.reference || '', description: data.description || '', date: new Date().toISOString() };
    await this.put('fees', payment);
    const student = await this.getById('users', data.studentId);
    if (student) {
      student.feesPaid = (student.feesPaid || 0) + data.amount;
      student.feesBalance = (student.feesRequired || 0) - student.feesPaid;
      await this.put('users', student);
    }
    return payment;
  },

  async updateFeesRequired(studentId, feesRequired) {
    const student = await this.getById('users', studentId);
    if (!student) return null;
    student.feesRequired = feesRequired;
    student.feesBalance = feesRequired - (student.feesPaid || 0);
    await this.put('users', student);
    const { password, ...safe } = student;
    return safe;
  },

  async getAllStudentFees() {
    const allUsers = await this.getAll('users');
    return allUsers.filter(u => u.role === 'student').map(u => ({
      studentId: u._id, admissionNumber: u.admissionNumber,
      firstName: u.firstName, lastName: u.lastName, className: u.className,
      feesRequired: u.feesRequired || 0, feesPaid: u.feesPaid || 0,
      feesBalance: (u.feesRequired || 0) - (u.feesPaid || 0),
    }));
  },

  async getStudentFees(studentId) {
    return (await this.getAll('fees')).filter(f => f.studentId === studentId);
  },

  async getStudentFeesStatus(studentId) {
    const student = await this.getById('users', studentId);
    if (!student) return { feesRequired: 0, feesPaid: 0, feesBalance: 0, isPaid: true, canViewResults: true, paidPercentage: 100 };
    const required = student.feesRequired || 0;
    const paid = student.feesPaid || 0;
    const balance = required - paid;
    const paidPercentage = required > 0 ? Math.round((paid / required) * 100) : 100;
    const isPaid = balance <= 0;
    const settings = await this.getSettings();
    const feesBlockingEnabled = settings?.feesBlockingEnabled !== false;
    const feesViewPercentage = settings?.feesViewPercentage || 50;
    let canViewResults = true;
    if (feesBlockingEnabled && !isPaid) {
      canViewResults = paidPercentage >= feesViewPercentage;
    }
    return { feesRequired: required, feesPaid: paid, feesBalance: balance, isPaid, canViewResults, paidPercentage, feesBlockingEnabled, feesViewPercentage };
  },

  async addFeesPayment(data) {
    return this.recordPayment(data);
  },

  async setStudentFees(studentId, feesRequired) {
    return this.updateFeesRequired(studentId, feesRequired);
  },

  async updateStudentFees(studentId, feesRequired, feesPaid) {
    const student = await this.getById('users', studentId);
    if (!student) return null;
    student.feesRequired = feesRequired;
    student.feesPaid = feesPaid;
    student.feesBalance = feesRequired - feesPaid;
    await this.put('users', student);
    const { password, ...safe } = student;
    return safe;
  },

  // Settings
  async getSettings() { return await this.getById('settings', 'default'); },
  async updateSettings(data) { const s = await this.getById('settings', 'default') || {}; Object.assign(s, data); s._id = 'default'; await this.put('settings', s); return s; },

  // Verify Results (Headmaster)
  async verifyResults(ids) {
    for (const id of ids) {
      const r = await this.getById('results', id);
      if (r) { r.status = 'verified'; r.verifiedAt = new Date().toISOString(); await this.put('results', r); }
    }
  },
  async unverifyResults(ids) {
    for (const id of ids) {
      const r = await this.getById('results', id);
      if (r) { r.status = 'submitted'; delete r.verifiedAt; await this.put('results', r); }
    }
  },

  // Feedback (Headmaster to Teachers)
  async getFeedback(filters) {
    let items = await this.getAll('feedback');
    if (filters?.teacherId) items = items.filter(f => f.teacherId === filters.teacherId);
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return items;
  },
  async addFeedback(data) {
    const fb = { _id: genId(), ...data, createdAt: new Date().toISOString(), read: false };
    await this.put('feedback', fb);
    return fb;
  },
  async markFeedbackRead(id) {
    const fb = await this.getById('feedback', id);
    if (fb) { fb.read = true; await this.put('feedback', fb); }
  },
  async deleteFeedback(id) {
    await this.delete('feedback', id);
  },

  // Headmaster - Pending Fees
  async getPendingFees() {
    const allUsers = await this.getAll('users');
    const settings = await this.getSettings();
    const feesViewPercentage = settings?.feesViewPercentage || 50;
    const students = allUsers.filter(u => u.role === 'student');
    const pending = [];
    for (const s of students) {
      const required = s.feesRequired || 0;
      const paid = s.feesPaid || 0;
      const balance = required - paid;
      if (balance > 0) {
        const paidPercentage = required > 0 ? Math.round((paid / required) * 100) : 0;
        const classNameObj = s.className ? await this.getById('classes', s.className) : null;
        pending.push({
          studentId: s._id, admissionNumber: s.admissionNumber,
          firstName: s.firstName, lastName: s.lastName,
          className: classNameObj, gender: s.gender,
          feesRequired: required, feesPaid: paid, feesBalance: balance,
          paidPercentage, canViewResults: paidPercentage >= feesViewPercentage,
        });
      }
    }
    pending.sort((a, b) => b.feesBalance - a.feesBalance);
    return { pending, feesViewPercentage, totalPending: pending.length };
  },

  // Finance - get all payments
  async getAllPayments() {
    const payments = await this.getAll('fees');
    payments.sort((a, b) => new Date(b.date) - new Date(a.date));
    return payments;
  },

  // Finance - block/unblock student results
  async setStudentResultBlock(studentId, blocked) {
    const student = await this.getById('users', studentId);
    if (!student) return null;
    student.resultBlocked = blocked;
    await this.put('users', student);
    return { studentId, resultBlocked: blocked };
  },
};

export default db;

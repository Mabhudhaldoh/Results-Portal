require('dotenv').config();

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const { connectDB, getDB } = require('./config/db');
const db = require('./config/database');


const seed = async () => {

    try {

        await connectDB();

        console.log("Using database:", getDB().databaseName);

        console.log("--------------------------------");
        console.log("🌱 Starting Database Seed");
        console.log("--------------------------------");


        const hash = (password) => {
            return bcrypt.hashSync(password,10);
        };


        /*
        ============================
        CLEAR EXISTING DATA
        ============================
        */

        await db.collection('users').deleteMany({});
        await db.collection('subjects').deleteMany({});
        await db.collection('departments').deleteMany({});
        await db.collection('classes').deleteMany({});
        await db.collection('streams').deleteMany({});
        await db.collection('academicYears').deleteMany({});
        await db.collection('gradings').deleteMany({});
        await db.collection('settings').deleteMany({});
        await db.collection('results').deleteMany({});
        await db.collection('attendance').deleteMany({});
        await db.collection('auditLogs').deleteMany({});


        console.log("Old data cleared");


        /*
        ============================
        DEPARTMENTS
        ============================
        */


        const sciences = await db.collection('departments').create({

            _id:"DEP001",

            name:"Sciences"

        });


        const arts = await db.collection('departments').create({

            _id:"DEP002",

            name:"Arts"

        });


        const commercials = await db.collection('departments').create({

            _id:"DEP003",

            name:"Commercials"

        });



        console.log("Departments created");



        /*
        ============================
        SUBJECTS
        ============================
        */


        const subjects = [];


        const subjectData = [

            {
                _id:"SUB001",
                name:"Biology",
                code:"BIO01",
                department:sciences._id
            },

            {
                _id:"SUB002",
                name:"Chemistry",
                code:"CHE01",
                department:sciences._id
            },

            {
                _id:"SUB003",
                name:"Physics",
                code:"PHY01",
                department:sciences._id
            },

            {
                _id:"SUB004",
                name:"Computer Science",
                code:"COM01",
                department:sciences._id
            },

            {
                _id:"SUB005",
                name:"Pure Mathematics",
                code:"MTH01",
                department:sciences._id
            },


            {
                _id:"SUB006",
                name:"History",
                code:"HIS01",
                department:arts._id
            },


            {
                _id:"SUB007",
                name:"Literature in English",
                code:"LIT01",
                department:arts._id
            },


            {
                _id:"SUB008",
                name:"Economics",
                code:"ECO01",
                department:commercials._id
            },


            {
                _id:"SUB009",
                name:"Accounting",
                code:"ACC01",
                department:commercials._id
            },


            {
                _id:"SUB010",
                name:"Business Studies",
                code:"BUS01",
                department:commercials._id
            }

        ];



        for(const subject of subjectData){

            subjects.push(
                await db.collection('subjects').create({

                    ...subject,

                    teachers:[]

                })
            );

        }



        console.log(
            `${subjects.length} Subjects created`
        );



        /*
        ============================
        USERS - TEACHERS
        ============================
        */


        const teacher1 = await db.collection('users').create({

            _id:"TCH001",

            email:"chindara.v@mlkschools.ac.zw",

            password:hash("teacher123"),

            firstName:"Vimbai",

            lastName:"Chindara",

            role:"teacher",

            employeeNumber:"TCH001",

            phone:"+263771111111",

            assignedSubjects:[
                "SUB001",
                "SUB002"
            ],

            assignedClasses:[],

            isActive:true

        });



        const teacher2 = await db.collection('users').create({

            _id:"TCH002",

            email:"chabuda.s@mlkschools.ac.zw",

            password:hash("teacher123"),

            firstName:"Sarudzai",

            lastName:"Chabuda",

            role:"teacher",

            employeeNumber:"TCH002",

            phone:"+263772222222",

            assignedSubjects:[
                "SUB006",
                "SUB007"
            ],

            assignedClasses:[],

            isActive:true

        });



        const financeUser = await db.collection('users').create({
          _id: "FIN001", email: "finance@mlkschools.ac.zw",
          password: hash("finance123"),
          firstName: "Finance", lastName: "Officer",
          role: "finance", employeeNumber: "FIN001",
          phone: "+263773333333", isActive: true
        });

        const headmasterUser = await db.collection('users').create({
          _id: "HEA001", email: "headmaster@mlkschools.ac.zw",
          password: hash("headmaster123"),
          firstName: "School", lastName: "Headmaster",
          role: "headmaster", employeeNumber: "HEA001",
          phone: "+263774444444", isActive: true
        });

        console.log("Finance and Headmaster created");
        console.log("Teachers created");




        /*
        ============================
        CLASSES AND STREAMS
        ============================
        */


        const classList = [

            "Form 1",
            "Form 2",
            "Form 3",
            "Form 4",
            "Lower Six",
            "Upper Six"

        ];


        const createdClasses=[];


        let classCounter=1;


        for(const className of classList){


            const classId =
                "CLS00"+classCounter;


            const cls =
            await db.collection('classes').create({

                _id:classId,

                name:className,

                streams:[],

                classTeacher:null

            });



            const streamIds=[];



            for(let i=1;i<=4;i++){


                const stream =
                await db.collection('streams').create({

                    _id:`${classId}-STR0${i}`,

                    name:String.fromCharCode(64+i),

                    class:classId

                });


                streamIds.push(stream._id);


            }


            cls.streams=streamIds;


            await db.collection('classes').save(cls);



            createdClasses.push(cls);


            classCounter++;

        }



        console.log("Classes and streams created");




        /*
        ============================
        ACADEMIC YEAR
        ============================
        */


        const academicYear =
        await db.collection('academicYears').create({

            _id:"YEAR2026",

            name:"2026",

            isActive:true,


            terms:[

                {
                    _id:"TERM001",
                    name:"Term 1",
                    isActive:true
                },

                {
                    _id:"TERM002",
                    name:"Term 2",
                    isActive:false
                },

                {
                    _id:"TERM003",
                    name:"Term 3",
                    isActive:false
                }

            ]

        });



        /*
        ============================
        GRADING
        ============================
        */


        await db.collection('gradings').create({

            _id:"GRADE001",

            name:"A-Level Standard",

            isActive:true,

            levels:[

                {
                    grade:"A",
                    minMark:80,
                    maxMark:100,
                    points:5
                },

                {
                    grade:"B",
                    minMark:70,
                    maxMark:79,
                    points:4
                },

                {
                    grade:"C",
                    minMark:60,
                    maxMark:69,
                    points:3
                },

                {
                    grade:"D",
                    minMark:50,
                    maxMark:59,
                    points:2
                },

                {
                    grade:"E",
                    minMark:40,
                    maxMark:49,
                    points:1
                },

                {
                    grade:"U",
                    minMark:0,
                    maxMark:39,
                    points:0
                }

            ]

        });




        /*
        ============================
        SETTINGS
        ============================
        */


        await db.collection('settings').create({

            _id:"SET001",

            schoolName:
            "Martin Luther King Jnr. Family of Schools",

            motto:
            "Quality Education to the Total Person for the Whole Nation",

            academicYear:
            academicYear._id,

            currentTerm:"Term 1"

        });




        /*
        ============================
        ADMIN
        ============================
        */


        await db.collection('users').create({

            _id:"ADM001",

            email:"admin@mlkschools.ac.zw",

            password:hash("admin123"),

            firstName:"System",

            lastName:"Administrator",

            role:"admin",

            employeeNumber:"ADM001",

            isActive:true

        });




        /*
        ============================
        STUDENTS
        ============================
        */


        const students=[
            "Tendai Muparutsa",
            "Chiedza Chakanyuka",
            "Tinashe Moyo",
            "Rumbidzai Ndhlovu",
            "Blessing Sigobe"
        ];

        const studentSports = [
            "Football, Athletics",
            "Netball",
            "Cricket, Swimming",
            "Athletics, Hockey",
            "Basketball"
        ];



        let counter=1;


        for(const fullname of students){


            const names=fullname.split(" ");



            await db.collection('users').create({

                _id:
                `STU00${counter}`,

                admissionNumber:
                `MLK2026${counter}`,

                firstName:names[0],

                lastName:names[1],

                email:
                `student${counter}@mlkschools.ac.zw`,

                password:
                hash("student123"),

                role:"student",

                className:
                createdClasses[0]._id,

                stream:
                "CLS001-STR01",

                sports:
                studentSports[counter - 1] || "",

                isActive:true

            });


            counter++;

        }



        console.log("Students created");


        /*
        ============================
        ATTENDANCE
        ============================
        */


        for(let i=1;i<=students.length;i++){

            await db.collection('attendance').create({

                student:`STU00${i}`,

                className:createdClasses[0]._id,

                stream:"CLS001-STR01",

                academicYear:academicYear._id,

                term:"Term 1",

                daysPresent:88,

                daysAbsent:5,

                totalDays:93

            });

        }



        console.log("Attendance records created");



        console.log("--------------------------------");
        console.log("✅ DATABASE SEED COMPLETE");
        console.log("--------------------------------");

        console.log(`
LOGIN DETAILS

ADMIN:
admin@mlkschools.ac.zw
admin123


TEACHER:
chindara.v@mlkschools.ac.zw
teacher123


STUDENT:
student1@mlkschools.ac.zw
student123

        `);



        process.exit(0);



    }
    catch(error){

        console.error("Seed Error:",error);

        process.exit(1);

    }

};


seed();
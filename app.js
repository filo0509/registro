/*
 *registro_docente/:classe/media/:studente/:materia -> voti di uno studente in una materia
 *registro_docente/:classe/media/:studente          -> voti di uno studente
 *registro_docente/:classe/media/:materia           -> voti materia
 */

// ToDO I have to mirror the situazione_studente of the teacher for the students
// ToDO un docente può aggiungere voti solo per la sua materia
// ! Da implementare che una materia contiene più professori e poi quando si aggiungono i professori si linkano automaticamente ad una materia
// ToDo uno studente può essere associato solo ad una classe
// ! Il radar chart non si aggiorna misteriosamente
// ! Da sistemare la creazione di nuove classi, non devono esserci doppioni e più studenti in diverse classi
// ! Sistemare la vista mobile, soprattutto il calendario, navbar e homepage. C'è un problema col login nel registro studente
// ! Aggiungere la nav col toggler a tutte le pagine. Aggiungere la searchbar anche su mobile
// ! Assenze da fare (calendario delle presenze) !!!!!!!!!! Con le assenze da giustificare, le motivazioni delle assenze etc...
// ! Vanno fatti anche i permessi (entrate ed uscite fuori orario)

// ? Se premi la rotella dello scroll e trascini puoi selezionare + righe da modificare

// All the modules should imported here
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const mongoose = require("mongoose");
const session = require("express-session");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const { request } = require("express");
const cookieParser = require("cookie-parser");
const nodemailer = require("nodemailer");
const AdminJS = require("adminjs");
const AdminJSMongoose = require("@adminjs/mongoose");
const AdminJSExpress = require("@adminjs/express");
const nodeCron = require("node-cron");
const moment = require("moment");
const bcrypt = require("bcryptjs");
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");
const passport = require("passport");

oneMonth = 1000 * 60 * 60 * 24 * 30;

// AdminJS is used for the administration of the database directly on the website
AdminJS.registerAdapter(AdminJSMongoose);

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(cookieParser());

// setting up the sessions
app.use(
  session({
    secret: "bsdfb5ju435h34v53j4v53h45",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: oneMonth,
    },
  })
);

// we use passport to handle the sessions
app.use(passport.initialize());
app.use(passport.session());

mongoose.Promise = global.Promise;

// Connect MongoDB with mongoose, it simplyfies all the usage of the DB.
mongoose.connect(
  "mongodb+srv://filippodonati:Filodatorcere.05@cluster0.aeaxwow.mongodb.net/?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    if (!err) {
      console.log("MongoDB Connection Succeeded.");
    } else {
      console.log("Error in DB connection: " + err);
    }
  }
);

// This is the schema for the different subjects
const subjectSchema = new mongoose.Schema({
  teachers: [String],
  name: String,
});

// This is the schema for a grade
const gradeSchema = new mongoose.Schema({
  student: String,
  grade: Number,
  date: Date,
  subject: String,
  classroom: String,
});

// mongoose schema that represents the user
const lessonSchema = new mongoose.Schema({
  title: String,
  description: String,
  subject: String,
  teacher: String,
  date: Date,
  ora: Number,
});

// the average of the grades in a certain subject
const averageGradeSchema = new mongoose.Schema({
  mean: Number,
  subject: subjectSchema,
});

const absenceSchema = new mongoose.Schema({
  dateStart: Date,
  dateEnd: Date,
  giustificato: Boolean,
});

// this is the schema of a single user (login with google)
const userSchema = new mongoose.Schema({
  classe: String,
  email: String,
  password: String,
  username: String,
  name: String,
  grades: [gradeSchema],
  teacher: Boolean,
  segretario: Boolean,
  admin: Boolean,
  genitore: Boolean,
  studente: Boolean,
  averageGrades: [Number],
  assenze: [absenceSchema],
});

// the schema for a classroom that contains N students
const classroomSchema = new mongoose.Schema({
  name: String,
  teachers: [String],
  students: [String],
  subjects: [subjectSchema],
  grades: [gradeSchema],
  lessons: [lessonSchema],
});

const AdminSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
subjectSchema.plugin(findOrCreate);

// Create the effective models in the DB
const User = new mongoose.model("User", userSchema);
const Grade = new mongoose.model("Grade", gradeSchema);
const Classroom = new mongoose.model("Classroom", classroomSchema);
const Admin = new mongoose.model("Admin", AdminSchema);
const Lesson = new mongoose.model("Lesson", lessonSchema);
const Subject = new mongoose.model("Subject", subjectSchema);
const Absence = new mongoose.model("Absence", absenceSchema);
const adminJs = new AdminJS({
  resources: [User, Grade, Classroom, Subject, Lesson],
});

const router = AdminJSExpress.buildRouter(adminJs);

const adminJsOptions = {
  resources: [Admin],
};
// For the admin page
app.use(adminJs.options.rootPath, router);

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID:
        "641765305810-77p3opguck443n5vjbqp6rm8p0dmlu4e.apps.googleusercontent.com",
      clientSecret: "cEcJO4aJFxWWtuE56is627xO",
      //callbackURL: "https://registro-bx1s.onrender.com/auth/google/callback",
      callbackURL: "http://localhost:3000/auth/google/callback",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async function (accessToken, refreshToken, profile, cb) {
      await User.findOne({
        username: profile.id,
      }).then((doc) => {
        if (!doc) {
          sendEmail(
            profile.emails[0].value,
            "Avvenuta registrazione a SurveyMonth"
          );
        } else {
        }
      });
      // Se non trova l'utente lo crea
      await User.findOrCreate({ username: profile.id }, function (err, user) {
        user.name = profile.displayName;
        user.email = profile.emails[0].value;
        user.save();
        return cb(err, user);
      });
    }
  )
);

app.get("/", (req, res) => {
  res.render("index");
});

// Login Form
app.get("/registro/login", function (req, res) {
  res.render("login");
});

// Login Logic
// middleware
app.post(
  "/registro/login",
  passport.authenticate("local", {
    successRedirect: "/registro",
    failureRedirect: "/registro/login",
  }),
  function (req, res) {}
);

app.get("/registro/logout", (req, res) => {
  req.logout(req.user, (err) => {
    if (err) return next(err);
    res.redirect("/registro");
  });
});

// The root route with all the links to the other pages.
app.get("/registro", function (req, res) {
  if (req.isAuthenticated() && req.user.teacher == true) {
    Classroom.find({}, (err, classi) => {
      User.find({ studente: true }, (err, students) => {
        User.findOne(
          { _id: req.session.passport.user },
          function (err, profile) {
            res.render("registro", {
              linkRegistro: "/registro_docente",
              displayName: profile.name,
              isLoggedIn: true,
              studenti: students,
              classi: classi,
            });
          }
        );
      });
    });
  } else if (req.isAuthenticated()) {
    User.findOne({ _id: req.session.passport.user }, function (err, profile) {
      res.render("registro", {
        linkRegistro: "/registro_studente",
        displayName: profile.name,
        isLoggedIn: false,
        studenti: "",
        classi: "",
      });
    });
  } else {
    res.redirect("/registro/login");
  }
});

// Page for the students
app.get("/registro/registro_studente", function (req, res) {
  if (req.isAuthenticated() && req.user.studente == true) {
    res.render("registro_studente");
  } else {
    res.redirect("/registro");
  }
});

// Page for the teachers
app.get("/registro/registro_docente", function (req, res) {
  if (req.isAuthenticated() && req.user.teacher == true) {
    Classroom.find(
      {
        teachers: req.user.id,
      },
      (err, doc) => {
        if (err) {
          console.log(`Error: ` + err);
        } else {
          res.render("registro_docente", {
            classrooms: doc,
            linkRegistro: "",
            displayName: req.user.name,
          });
        }
      }
    );
  } else {
    res.redirect("/login");
  }
});

app.get("/registro/registro_docente/:classe/agenda", async function (req, res) {
  if (req.isAuthenticated() && req.user.teacher == true) {
    Classroom.findOne({ _id: req.params.classe }).then((err, classe) => {
      if (err) {
        console.log("Err: " + err);
      } else {
        User.find({ _id: classe.students }, (err, studenti) => {
          res.render("docente_agenda", {
            subjects: classe.subjects,
            students: studenti,
          });
        });
      }
    });
  } else {
    res.redirect("/");
  }
});

// Page where a teacher can see the overall situation of a single class
// ToDo I have to cancel the average_grades from the DB because it ruins performance
// ToDo find why the grades are inverted
app.get("/registro/registro_docente/:classe/medie", async function (req, res) {
  if (req.isAuthenticated() && req.user.teacher == true) {
    Classroom.findOne({ _id: req.params.classe }, async (err, classi) => {
      if (err) {
        console.log(`Error: ` + err);
      } else {
        classi.students.sort();
        // put in grades_average the average of the grades of the class based on the subject
        var sumGrades = [];
        var numGrades = [];
        for (let i = 0; i < classi.students.length; i++) {
          sumGrades.push([]);
          numGrades.push([]);
        }
        for (let i = 0; i < classi.students.length; i++) {
          for (let j = 0; j < classi.subjects.length; j++) {
            sumGrades[i][j] = 0;
            numGrades[i][j] = 0;
          }
        }

        for (let i = 0; i < classi.students.length; i++) {
          for (let j = 0; j < classi.subjects.length; j++) {
            for (let k = 0; k < classi.grades.length; k++) {
              if (
                classi.grades[k].student == classi.students[i] &&
                classi.grades[k].subject == classi.subjects[j]._id
              ) {
                sumGrades[i][j] += parseFloat(classi.grades[k].grade);
                numGrades[i][j]++;
              }
            }
          }
        }

        // ToDo control if the j and i index have the same control type
        var averageGrades = [];
        for (let i = 0; i < classi.students.length; i++) {
          averageGrades.push([]);
          for (let j = 0; j < classi.subjects.length; j++) {
            averageGrades[i].push([]);
          }
        }

        for (let i = 0; i < classi.students.length; i++) {
          for (let j = 0; j < classi.subjects.length; j++) {
            // round to 2 figures after the comma
            if (numGrades[i][j] != 0) {
              averageGrades[i][j] = parseFloat(
                Math.round((sumGrades[i][j] / numGrades[i][j]) * 100) / 100
              );
            } else {
              averageGrades[i][j] = 0;
            }
          }
        }

        for (var i = 0; i < classi.students.length; i++) {
          User.updateOne(
            { _id: classi.students[i] },
            { averageGrades: averageGrades[i] },
            (err, doc) => {
              if (err) {
                console.log(`Error: ` + err);
              }
            }
          );
        }

        // ! The page is rendered before the averageGrades are updated
        User.find({ _id: classi.students }, (err, doc) => {
          if (err) {
            console.log(`Error: ` + err);
          } else {
            res.render("registro_classe", {
              students: doc,
              subjects: classi.subjects,
              averageGrades: averageGrades,
              classe: classi,
              linkRegistro: "",
              displayName: req.user.name,
            });
          }
        });
      }
    });
  } else {
    res.redirect("/registro");
  }
});

app.get("/registro/aggiungi_utente", function (req, res) {
  if (req.isAuthenticated() && req.user.segretario === true) {
    Classroom.find({}, (err, doc) => {
      if (err) {
        console.log(`Error: ` + err);
      } else {
        res.render("aggiungi_utente", {
          classrooms: doc,
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/registro/aggiungi_materia", function (req, res) {
  if (req.isAuthenticated() && req.user.segretario === true) {
    User.find({ teacher: true }, (err, doc) => {
      if (err) {
        console.log(`Error: ` + err);
      } else {
        res.render("aggiungi_materia", {
          teachers: doc,
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/registro/aggiungi_classe", function (req, res) {
  if (req.isAuthenticated() && req.user.segretario === true) {
    User.find(
      {
        teacher: true,
      },
      (err, docenti) => {
        if (err) {
          console.log(`Error: ` + err);
        } else {
          Subject.find({}, (err, materie) => {
            if (err) {
              console.log(`Error: ` + err);
            } else {
              User.find(
                {
                  studente: true,
                  classe: null,
                },
                (err, utenti) => {
                  if (err) {
                    console.log(`Error: ` + err);
                  } else {
                    res.render("aggiungi_classe", {
                      students: utenti,
                      subjects: materie,
                      teachers: docenti,
                    });
                  }
                }
              );
            }
          });
        }
      }
    );
  } else {
    res.redirect("/login");
  }
});

app.post("/registro/aggiungi_materia", function (req, res) {
  const name = req.body.name;
  const teachers = req.body.teacher;

  Subject.findOrCreate(
    {
      name: name,
      teachers: teachers,
    },
    function (err, subject) {
      subject.name = name;
      subject.teachers = teachers;
      subject.save();
    }
  );

  res.redirect("/registro");
});

// Manca da aggiungere la classe
app.post("/registro/aggiungi_utente", function (req, res) {
  const username = req.body.username;
  const name = req.body.name;
  const password = req.body.password;
  const role = req.body.role;

  User.findOne({ name: name, username: username }, (err, doc) => {
    if (!doc) {
      if (role == 0) {
        User.register(
          new User({
            username: req.body.username,
            name: req.body.name,
            studente: true,
          }),
          req.body.password,
          function (err, user) {
            if (err) {
              console.log(err);
              return res.render("aggiungi_utente");
            }
            passport.authenticate("local")(req, res, function () {
              res.redirect("/registro");
            });
          }
        );
      } else if (role == 1) {
        User.register(
          new User({
            username: req.body.username,
            name: req.body.name,
            teacher: true,
          }),
          req.body.password,
          function (err, user) {
            if (err) {
              console.log(err);
              return res.render("aggiungi_utente");
            }
            passport.authenticate("local")(req, res, function () {
              res.redirect("/registro");
            });
          }
        );
      }
    } else {
      res.redirect("/registro");
    }
  });
});

app.post("/registro/aggiungi_classe", function (req, res) {
  const class_students = req.body.students;
  const class_name = req.body.name;
  const class_subjects = req.body.subjects;
  const class_teachers = req.body.teachers;

  // Bisogna ordinare in base al nome, non all'id
  class_students.sort();

  Subject.find({ _id: class_subjects }, (err, doc) => {
    if (err) {
      console.log(`Error: ` + err);
    } else {
      var classroom = new Classroom({
        name: class_name,
        students: class_students,
        teachers: class_teachers,
        subjects: doc,
      });

      classroom.save();
      User.updateMany(
        { _id: class_students },
        { classe: classroom._id },
        function (err, docs) {
          if (err) {
            console.log(err);
          } else {
            console.log("Updated Docs : ", docs);
          }
        }
      );
    }
  });

  res.redirect("/registro");
});

// per la search bar devo aggiungere un field classe per ogni studente
// the situation for a single student
app.get(
  "/registro/registro_docente/:classe/medie/:studente",
  async function (req, res) {
    User.findById(req.params.studente, (err, doc) => {
      // order the doc.grades based on the date in chronological order
      doc.grades.sort((a, b) => (a.date > b.date ? 1 : -1));
      if (err) {
        console.log(`Error: ` + err);
      } else {
        Classroom.findById(req.params.classe, (err, classe) => {
          // ToDo un professore può aggiungere voti solo per la sua/e materia/e
          console.log(classe);
          res.render("situazione_studente", {
            subjects: classe.subjects,
            student: doc,
            linkRegistro: "",
            displayName: req.user.name,
          });
        });
      }
    });
  }
);

app.post("/registro/registro_docente/:classe/medie", async function (req, res) {
  if (req.isAuthenticated() && req.user.teacher == true) {
    const materia = req.body.selectmateria;
    const studente = req.body.selectstudente;
    const voto = req.body.selectvoto;
    const classe = req.params.classe;
    const data = req.body.selectdata;
    console.log(materia);
    Classroom.updateOne(
      { _id: classe },
      {
        $push: {
          grades: {
            student: studente,
            subject: materia,
            grade: voto,
            date: data,
            classroom: classe,
          },
        },
      },
      (err, doc) => {
        if (err) {
          console.log(`Error: ` + err);
        }
      }
    );
    User.updateOne(
      { _id: studente },
      {
        $push: {
          grades: {
            student: studente,
            subject: materia,
            grade: voto,
            date: data,
            classroom: classe,
          },
        },
      },
      (err, doc) => {
        if (err) {
          console.log(`Error: ` + err);
        }
      }
    );

    res.redirect(`/registro/registro_docente/${classe}/medie/`);
  }
});

// the list of the "lectures" for the students
app.get("/registro/lezioni", function (req, res) {
  if (req.isAuthenticated() && req.user.studente == true) {
    Classroom.findOne(
      { students: req.session.passport.user },
      (err, classe) => {
        if (err) {
          console.log(`Error: ` + err);
        } else {
          // sort by date in chronological order the lessons of classes
          classe.lessons.sort((a, b) => (a.date > b.date ? 1 : -1));
          res.render("lezioni_classe", {
            classe: classe,
            moment: moment,
            linkRegistro: "",
            displayName: req.user.name,
          });
        }
      }
    );
  } else {
    res.redirect("/registro");
  }
});

// the same thing as /lezioni but for the teacher
app.get("/registro/registro_docente/:classe/lezioni", function (req, res) {
  if (req.isAuthenticated() && req.user.teacher == true) {
    Classroom.findOne({ id: req.params.classe }, (err, classe) => {
      if (err) {
        console.log(`Error: ` + err);
      } else {
        // sort by date in chronological order the lessons of classes
        classe.lessons.sort((a, b) => (a.date > b.date ? 1 : -1));
        res.render("lezioni_classe", {
          classe: classe,
          moment: moment,
          linkRegistro: "",
          displayName: req.user.name,
        });
      }
    });
  }
});

// this is the posto request fot the lessons, a teacher can add a lesson
app.post(
  "/registro/registro_docente/:classe/lezioni",
  async function (req, res) {
    if (req.isAuthenticated() && req.user.teacher == true) {
      const materia = req.body.selectmateria;
      const classe = req.params.classe;
      const description = req.body.description;
      const data = req.body.selectdata;
      const hour = req.body.selectHour;

      Classroom.updateOne(
        { _id: classe },
        {
          $push: {
            lessons: {
              subject: materia,
              date: data,
              classroom: classe,
              description: description,
              teacher: req.session.passport.user,
              ora: hour,
            },
          },
        },
        (err, doc) => {
          if (err) {
            console.log(`Error: ` + err);
          }
        }
      );

      res.redirect("/registro");
    }
  }
);

// The dashboard where a student can see his situation
app.get("/registro/dashboard_studente", function (req, res) {
  if (req.isAuthenticated()) {
    User.findById(req.user.id, (err, doc) => {
      doc.grades.sort((a, b) => (a.date > b.date ? 1 : -1));
      if (err) {
        console.log(`Error: ` + err);
      } else {
        Classroom.findOne({ students: doc._id }, (err, classe) => {
          res.render("dashboard_studente", {
            student: doc,
            subjects: classe.subjects,
            linkRegistro: "",
            displayName: req.user.name,
          });
        });
      }
    });
  }
});

// the grades of a students
app.get("/registro/voti_studente", function (req, res) {
  console.log(req.session.passport.user);
  if (req.isAuthenticated()) {
    User.findOne({ _id: req.session.passport.user }, function (err, doc) {
      doc.grades.sort((a, b) => (a.date > b.date ? 1 : -1));
      if (err) {
        console.log(`Error: ` + err);
      } else {
        Classroom.findOne({ students: doc._id }, (err, classe) => {
          console.log(classe);
          res.render("voti_studente", {
            student: doc,
            subjects: classe.subjects,
            linkRegistro: "",
            displayName: req.user.name,
          });
        });
      }
    });
  } else {
    res.redirect("/registro");
  }
});

// ToDo !!!!
app.get("/registro/calendario", function (req, res) {
  if (req.isAuthenticated() && req.user.studente == true) {
    User.findOne({ _id: req.session.passport.user }, function (err, studente) {
      if (err) {
        console.log(`Error: ` + err);
      } else {
        Classroom.findOne({ students: studente._id }, (err, classe) => {
          // le sorto in base all'ora di firma
          classe.lessons.sort((a, b) =>
            a.date + a.ora >= b.date + b.ora ? 1 : -1
          );

          // ? devo aggiungere i voti nel calendario, con un link che rimandi a /voti_studente
          console.log(studente.grades);
          res.render("calendario", {
            student: studente,
            lessons: classe.lessons,
            subjects: classe.subjects,
            displayName: req.user.name,
          });
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

// ToDO !!!!
app.get("/registro/registro_segretarie", function (req, res) {
  if (req.isAuthenticated() && req.user.segretario == true) {
    Classroom.find({}, (err, doc) => {
      if (err) {
        console.log(`Error: ` + err);
      } else {
        res.render("registro_segretarie", {
          classrooms: doc,
          linkRegistro: "",
          displayName: req.user.name,
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

// ! questo deve restare per ultimo
app.use(function (req, res, next) {
  res
    .status(404)
    .send("<center><h1>Errore 404, pagina non trovata</h1></center>");
});

// !Start the server
app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port 3000, http://localhost:3000");
});

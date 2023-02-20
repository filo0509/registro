// ? Ogni tanto bisogna aggiornare le impostazioni della mail dalla quale mando le mail
// ? Failed to fetch user profile, oppure, failed to obtain access token li ottengo perchè google
// ? non accetta i localhost

/*
 *registro_docente/:classe/media/:studente/:materia -> voti di uno studente in una materia
 *registro_docente/:classe/media/:studente          -> voti di uno studente
 *registro_docente/:classe/media/:materia           -> voti materia
 */

// ToDO I have to mirror the situazione_studente of the teacher for the students

// All the modules should imported here
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const passport = require("passport");
const mongoose = require("mongoose");
const session = require("express-session");
const passportLocalMongoose = require("passport-local-mongoose");
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
  teacher: String,
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

// this is the schema of a single user (login with google)
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
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

// Create the effective models in the DB
const User = new mongoose.model("User", userSchema);
const Grade = new mongoose.model("Grade", gradeSchema);
const Classroom = new mongoose.model("Classroom", classroomSchema);
const Admin = new mongoose.model("Admin", AdminSchema);
const Lesson = new mongoose.model("Lesson", lessonSchema);
const adminJs = new AdminJS({
  resources: [User, Grade, Classroom],
});

const router = AdminJSExpress.buildRouter(adminJs);

const adminJsOptions = {
  resources: [Admin],
};
// For the admin page
app.use(adminJs.options.rootPath, router);

passport.use(User.createStrategy());

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
      callbackURL: "https://registro-bx1s.onrender.com/auth/google/callback",
      //callbackURL: "http://localhost:3000/auth/google/callback",
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

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/google" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/");
  }
);

// The root route with all the links to the other pages.
app.get("/", function (req, res) {
  if (req.isAuthenticated() && req.user.teacher == true) {
    User.findOne({ _id: req.session.passport.user }, function (err, profile) {
      res.render("index", {
        linkRegistro: "/registro_docente",
        displayName: profile.name,
      });
    });
  } else if (req.isAuthenticated()) {
    User.findOne({ _id: req.session.passport.user }, function (err, profile) {
      res.render("index", {
        linkRegistro: "/registro_studente",
        displayName: profile.name,
      });
    });
  } else {
    res.render("index", {
      linkRegistro: "/auth/google",
      displayName: req.user,
    });
  }
});

// Page for the students
app.get("/registro_studente", function (req, res) {
  if (req.isAuthenticated() && req.user.studente == true) {
    res.render("registro_studente");
  } else {
    res.redirect("/");
  }
});

// Page for the teachers
app.get("/registro_docente", function (req, res) {
  if (req.isAuthenticated() && req.user.teacher == true) {
    Classroom.find(
      {
        teachers: req.user.name,
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
    res.redirect("/auth/google");
  }
});

// Page where a teacher can see the overall situation of a single class
// ToDo I have to cancel the average_grades from the DB because it ruins performance
// ? lo avevo fatto ma github ha perso le modifiche
app.get("/registro_docente/:classe/medie", async function (req, res) {
  if (req.isAuthenticated() && req.user.teacher == true) {
    Classroom.findOne({ _id: req.params.classe }, async (err, classi) => {
      if (err) {
        console.log(`Error: ` + err);
      } else {
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
                classi.grades[k].subject == classi.subjects[j].name
              ) {
                sumGrades[i][j] += parseFloat(classi.grades[k].grade);
                numGrades[i][j]++;
              }
            }
          }
        }

        var averageGrades = [];
        for (let i = 0; i < classi.subjects.length; i++) {
          averageGrades.push([]);
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
          console.log(classi.students[i]);
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
            console.log(doc);
          }
        });
      }
    });
  } else {
    res.redirect("/");
  }
});

// the situation for a single student
app.get("/registro_docente/:classe/medie/:studente", async function (req, res) {
  User.findById(req.params.studente, (err, doc) => {
    // order the doc.grades based on the date in chronological order
    doc.grades.sort((a, b) => (a.date > b.date ? 1 : -1));
    if (err) {
      console.log(`Error: ` + err);
    } else {
      Classroom.findById(req.params.classe, (err, classe) => {
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
});

app.post("/registro_docente/:classe/medie", async function (req, res) {
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

    res.redirect(`/registro_docente/${classe}/medie/${studente}`);
  }
});

// the list of the "lectures" for the students
app.get("/lezioni", function (req, res) {
  if (req.isAuthenticated()) {
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
  }
});

// the same thing as /lezioni but for the teacher
app.get("/registro_docente/:classe/lezioni", function (req, res) {
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
app.post("/registro_docente/:classe/lezioni", async function (req, res) {
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

    res.redirect("/");
  }
});

// The dashboard where a student can see his situation
app.get("/dashboard_studente", function (req, res) {
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
app.get("/voti_studente", function (req, res) {
  console.log(req.session.passport.user);
  if (req.isAuthenticated()) {
    User.findOne({ _id: req.session.passport.user }, function (err, doc) {
      doc.grades.sort((a, b) => (a.date > b.date ? 1 : -1));
      if (err) {
        console.log(`Error: ` + err);
      } else {
        Classroom.findOne({ students: doc._id }, (err, classe) => {
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
    res.redirect("/");
  }
});

// ToDo !!!!
app.get("/calendario", function (req, res) {
  if (req.isAuthenticated()) {
    User.findOne({ _id: req.session.passport.user }, function (err, doc) {
      if (err) {
        console.log(`Error: ` + err);
      } else {
        Classroom.findOne({ students: doc._id }, (err, classe) => {
          classe.lessons.sort((a, b) =>
            a.date + a.ora >= b.date + b.ora ? 1 : -1
          );
          res.render("calendario", {
            student: doc,
            lessons: classe.lessons,
            subjects: classe.subjects,
            moment: moment,
            linkRegistro: "",
            displayName: req.user.name,
          });
        });
      }
    });
  } else {
    res.redirect("/auth/google");
  }
});

// ToDO !!!!
app.get("/registro_segretarie", function (req, res) {
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
    res.redirect("/auth/google");
  }
});

// !Start the server
app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port 3000, http://localhost:3000");
});

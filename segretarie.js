app.get("/registro_docente", function (req, res) {
  if (req.isAuthenticated() && req.user.segretario == true) {
    res.render("registro_segretarie");
  } else {
    res.redirect("/auth/google");
  }
});

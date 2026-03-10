var express = require("express");
var router = express.Router();
router.use("/home", require(__dirname + "/homecontroller"));
router.use("/movie", require(__dirname + "/moviecontroller"));
router.use("/profile", require(__dirname + "/profilecontroller"));
router.use("/admin", require(__dirname + "/admin/admincontroller"));
router.use("/auth", require(__dirname + "/authcontroller"));
router.use("/notification", require(__dirname + "/notificationcontroller"));
router.use(
  "/authenticate",
  require(__dirname + "/admin/authenticatecontroller")
);

router.get("/", function (req, res) {
  let token = req.cookies.token;
  if (token) {
      return res.redirect("/home");
  }
  res.render("index");
});
module.exports = router;

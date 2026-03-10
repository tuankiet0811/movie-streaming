var express = require("express");
var app = express();

global.__basedir = __dirname;

var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());

var controller = require(__dirname + "/apps/controllers");
app.use(controller);

app.set("views", __dirname + "/apps/views");
app.set("view engine", "ejs");
app.use("/static", express.static(__dirname + "/public"));
var adminRouter = require("./apps/controllers/admin/admincontroller");
app.use("/admin", adminRouter);
app.use("/static", express.static(__dirname + "/public"));
app.use("/partical", express.static(__dirname + "/views/partical"));

var server = app.listen(3000, function(){
    console.log("server is running");
});
// Socket.io real-time notifications
try {
    var io = require("socket.io")(server, {
        cors: { origin: "*" }
    });
    global.__io = io;
    io.on("connection", function(socket){
        socket.on("join", function(email){
            if (email && typeof email === "string") {
                socket.join(email);
            }
        });
    });
} catch(e) {}

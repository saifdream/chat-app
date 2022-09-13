const auth = require("json-server-auth");
const jsonServer = require("json-server");
const express = require("express");
const cors = require('cors')
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);

global.io = io;

// Set up a domainList and check against it:
const domainList = ['http://localhost:3000', 'https://floating-cliffs-36616.herokuapp.com']

const corsOptions = {
    origin: function (origin, callback) {
        if (domainList.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
}

// Then pass them to cors:
app.use(cors(corsOptions));

const router = jsonServer.router("db.json");

// response middleware
router.render = (req, res) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', '*')
    const path = req.path;
    const method = req.method;

    if ( path.includes("/conversations") && (method === "POST" || method === "PATCH") ) {
        // emit socket event
        io.emit("conversation", {
            data: res.locals.data,
        });
    }

    if ( path.includes("/messages") && (method === "POST" || method === "PATCH") ) {
        // emit socket event
        // console.log(res.locals.data)
        io.emit("message", {
            data: res.locals.data,
        });
    }

    res.json(res.locals.data);
};

// const middlewares = jsonServer.defaults();

const middlewares = jsonServer.defaults({
    static: "build"
});

const port = process.env.PORT || 9000;

// Bind the router db to the app
app.db = router.db;

app.use(middlewares);

// app.use(express.static(path.join(__dirname, 'build')));


/*app.get('/!*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});*/

const rules = auth.rewriter({
    users: 640,
    conversations: 660,
    messages: 660,
});

app.use(rules);
app.use(auth);
app.use(router);

server.listen(port);

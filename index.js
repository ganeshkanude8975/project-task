const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const salt = 10;

const app = express();

app.use(express.json());
app.use(cors({ origin: "https://frontend-8k1o.vercel.app", credentials: true }));
app.use(cookieParser());

const db = mysql.createConnection({
  host: "bpuzanq87wq3r4olqj0l-mysql.services.clever-cloud.com",
  user: "bpuzanq87wq3r4olqj0l",
  password: "bMEneixFPwjNwxtsssnM",
  database: "bpuzanq87wq3r4olqj0l"
});

// Registration endpoint (fixed)
app.post("/register", (req, res) => {
  const sql = `INSERT INTO register (name, email, password) VALUES (?)`;
  bcrypt.hash(req.body.password.toString(), salt, (err, hash) => {
    if (err) return res.json({ Error: "Error for hashing password" });
    const values = [
      req.body.name,
      req.body.email,
      hash
    ];
    db.query(sql, [values], (err, result) => {
      if (err) return res.json({ Error: "inserting data Error in server" });
      return res.json({ Status: "Success" });
    });
  });
});

// Login endpoint (with JWT)
app.post("/login", (req, res) => {
  const sql = "SELECT * FROM register WHERE email = ?";
  db.query(sql, [req.body.email], (err, result) => {
    if (err) return res.json({ Error: "Login error" });
    if (result.length > 0) {
      bcrypt.compare(req.body.password, result[0].password, (err, response) => {
        if (err) return res.json({ Error: "Password hash error" });
        if (response) {
          // Generate JWT token
          const token = jwt.sign({ id: result[0].id, email: result[0].email }, "secret_key", { expiresIn: "1h" });
          return res.json({ Status: "Success", token });
        } else {
          return res.json({ Error: "Password not matched" });
        }
      });
    } else {
      return res.json({ Error: "Email does not exist" });
    }
  });
});

// Middleware to verify JWT
function verifyToken(req, res, next) {
  const bearerHeader = req.headers["authorization"];
  if (!bearerHeader) return res.status(401).json({ Error: "No token provided" });
  let token = bearerHeader;
  // Support 'Bearer <token>' format
  if (bearerHeader.startsWith("Bearer ")) {
    token = bearerHeader.split(" ")[1];
  }
  jwt.verify(token, "secret_key", (err, decoded) => {
    if (err) return res.status(401).json({ Error: "Invalid token" });
    req.user = decoded;
    next();
  });
}

app.get("/user", verifyToken, (req, res) => {
  var sql = `select * from register where id = '${req.user.id}'`;
  db.query(sql, (err, data) => {
    if (err) return res.json(err);
    return res.json(data[0]);
  });
});


app.post("/taskdetails", verifyToken, (req, res) => { 

  const date = new Date().toISOString().slice(0, 10);

  const sql = `INSERT INTO taskdetails (tasktitle, taskdescription, taskdate, taskstatus, user_id) VALUES (?)`;
  const values = [
    req.body.tasktitle,
    req.body.taskdescription,
    date,
    req.body.taskstatus,
    req.user.id   
  ];

  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error("Insert error:", err); 
      return res.status(500).json({ Error: "inserting data Error in server" });
    }
    return res.json({ Status: "Success" });
  });
});

app.get("/alltasklist", verifyToken, (req, res) => {
  const sql = `SELECT id, tasktitle, taskdescription, taskdate, taskstatus, user_id FROM taskdetails WHERE user_id = ?`;
  db.query(sql, [req.user.id], (err, data) => {
    if (err) return res.status(500).json({ Error: "Database error", details: err });
    return res.json(data);
  });
});

app.get("/taskcount", verifyToken, (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) AS total,
      SUM(taskstatus = 'pending') AS pending,
      SUM(taskstatus = 'progress') AS progress,
      SUM(taskstatus = 'completed') AS completed
    FROM taskdetails
    WHERE user_id = ?
  `;
  db.query(sql, [req.user.id], (err, result) => {
    if (err) return res.status(500).json({ Error: "Database error", details: err });
    return res.json(result[0]);
  });
});

// Edit task
app.put("/taskdetails/:id", verifyToken, (req, res) => {
  const sql = `UPDATE taskdetails SET tasktitle = ?, taskdescription = ?, taskstatus = ? WHERE id = ? AND user_id = ?`;
  db.query(sql, [req.body.tasktitle, req.body.taskdescription, req.body.taskstatus, req.params.id, req.user.id], (err, result) => {
    if (err) return res.status(500).json({ Error: "Update error", details: err });
    return res.json({ Status: "Success" });
  });
});

// Delete task
app.delete("/taskdetails/:id", verifyToken, (req, res) => {
  const sql = `DELETE FROM taskdetails WHERE id = ? AND user_id = ?`;
  db.query(sql, [req.params.id, req.user.id], (err, result) => {
    if (err) return res.status(500).json({ Error: "Delete error", details: err });
    return res.json({ Status: "Success" });
  });
});

// Change status (in progress/completed)
app.put("/taskdetails/status/:id", verifyToken, (req, res) => {
  const sql = `UPDATE taskdetails SET taskstatus = ? WHERE id = ? AND user_id = ?`;
  db.query(sql, [req.body.taskstatus, req.params.id, req.user.id], (err, result) => {
    if (err) return res.status(500).json({ Error: "Status update error", details: err });
    return res.json({ Status: "Success" });
  });
});


app.listen(1000, () => {
  console.log("Server is running ......");
});

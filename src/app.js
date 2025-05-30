/**
 * @desc this file containes the server for medical app
 * @author Anubrata Sarkar
 * @since 26th may 2025
*/

import express from "express";
import cors from "cors";
import morgan from "morgan";
import fs from 'fs';
import path from 'path';
import logger from "./utils/logger.utils.js"
import { sendSuccess } from "./utils/response.utils.js";
import constants from "./config/constants.config.js";
import mainrouter from "./routes/index.routes.js"

const app = express();

const allowedOrigins = "*";

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
  allowedHeaders: ["Authorization", "Content-Type"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev", {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.use("/api/v1",mainrouter)
app.get('/',(req, res)=>{
    const healthInfo = {
    appName: 'Medical API',
    status: 'running',
    uptime: process.uptime().toFixed(2) + ' seconds',
    environment: process.env.NODE_ENV || 'development'
  };
  return sendSuccess(res, constants.OK, "medical app working fine.",healthInfo)
})
app.get('/logs', (req, res) => {
  const logPath = path.join('logs' ,'app.log');

  fs.readFile(logPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send("Couldn't read log file");
    }
    // Split log into lines
    const lines = data.trim().split('\n');
    // Get last 100 lines (or fewer if file smaller)
    const last100Lines = lines.slice(-100).join('\n');

    res.type('text/plain').send(last100Lines);
  });
});

export default app;
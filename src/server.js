import app from './app.js'; // adjust path if needed
import { runMigrations } from './config/db.config.js';
import logger from "./utils/logger.utils.js"


const PORT = process.env.PORT || 3000;


async function startServer() {
  try {
    await runMigrations();

    app.listen(PORT, () => {
      logger.info(`Server is running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

startServer();
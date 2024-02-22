const express = require("express");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");

const app = express();
const PORT = process.env.PORT || 3000;
const keysFilePath = path.join(__dirname, "keys.json");

// Middleware to parse JSON bodies
app.use(express.json());

// Function to generate a random key
function generateRandomKey(minLength, maxLength) {
  const length =
    Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "";
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * chars.length);
    key += chars[index];
  }
  return key;
}

// Function to generate expiration date (in milliseconds)
function generateExpirationDate(days) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000; // Number of milliseconds in a day
  const currentDate = new Date();
  const expirationDate = new Date(
    currentDate.getTime() + days * millisecondsPerDay,
  );
  return expirationDate;
}

// Function to load keys from JSON file
function loadKeysFromFile() {
  try {
    const data = fs.readFileSync(keysFilePath);
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Function to save keys to JSON file
function saveKeysToFile(keys) {
  fs.writeFileSync(keysFilePath, JSON.stringify(keys, null, 2));
}

// Function to delete expired keys
function deleteExpiredKeys() {
  let keys = loadKeysFromFile();
  if (!keys) return;
  const currentTime = Date.now();
  keys = keys.filter((key) => key.expirationDate > currentTime);
  saveKeysToFile(keys);
}

// Schedule the task to run every hour
// cron.schedule('0 * * * *', deleteExpiredKeys);
setInterval(deleteExpiredKeys);

// Route to generate a key with expiration and store in JSON file
let lastGenerationTime = 0;
const cooldownPeriod = 86400000; // 1 day cooldown

app.get("/generate-key", (req, res) => {
	try {
		const currentTime = Date.now();
		if (currentTime - lastGenerationTime < cooldownPeriod) {
			// If cooldown period hasn't passed, return a message indicating the cooldown
			res.status(429).json({ message: "Please wait before generating a new key." });
			return;
		}
		// Generate a random key
		const key = generateRandomKey(6, 8);
		// Generate an expiration date (e.g., 1 day from now)
		const expirationDate = generateExpirationDate(1);
		// Load existing keys from file
		let keys = loadKeysFromFile();
		// Store the key and its expiration date
		keys.push({ key, expirationDate: expirationDate.getTime() });
		// Save updated keys to file
		saveKeysToFile(keys);
		// Update last generation time
		lastGenerationTime = currentTime;
		// Send response with key and expiration date
		res.json({ key, expirationDate });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error" });
	}
});

app.get("/keys.json", (req, res) => {
  const filePath = path.join(__dirname, "keys.json");
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error reading JSON file");
      return;
    }
    const jsonData = JSON.parse(data);
    res.json(jsonData);
  });
});

app.get("/", (req, res) => {
  res.send("Welcome");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

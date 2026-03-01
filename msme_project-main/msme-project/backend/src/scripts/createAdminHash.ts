import bcrypt from "bcrypt";

async function generateAdminHash() {
  const password = "admin123";
  const saltRounds = 10;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log("\n=== ADMIN PASSWORD HASH ===");
    console.log("Password:", password);
    console.log("Hash:", hash);
    console.log("\nCopy this hash and use it in your SQL INSERT statement:");
    console.log(`'${hash}'`);
    console.log("\n");
  } catch (error) {
    console.error("Error generating hash:", error);
  }
}

generateAdminHash();

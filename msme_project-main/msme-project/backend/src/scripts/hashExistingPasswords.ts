/**
 * Script to hash existing plain-text passwords in the database
 * Run this ONCE after implementing bcrypt to migrate existing users
 * 
 * Usage: npx ts-node src/scripts/hashExistingPasswords.ts
 */

import bcrypt from "bcrypt";
import { supabase } from "../lib/supabase";

const SALT_ROUNDS = 10;

async function hashPasswordsForTable(tableName: string) {
  console.log(`\n🔄 Processing ${tableName} table...`);
  
  try {
    // Fetch all users from the table
    const { data: users, error } = await supabase
      .from(tableName)
      .select("id, email, password");

    if (error) {
      console.error(`❌ Error fetching ${tableName}:`, error);
      return;
    }

    if (!users || users.length === 0) {
      console.log(`ℹ️  No users found in ${tableName}`);
      return;
    }

    console.log(`📊 Found ${users.length} users in ${tableName}`);

    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      // Skip if password is null or empty
      if (!user.password || user.password.trim() === "") {
        console.log(`⏭️  Skipping ${user.email} - no password set`);
        skipped++;
        continue;
      }

      // Check if password is already hashed (bcrypt hashes start with $2b$)
      if (user.password.startsWith("$2b$")) {
        console.log(`⏭️  Skipping ${user.email} - already hashed`);
        skipped++;
        continue;
      }

      // Hash the plain-text password
      const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

      // Update the user with hashed password
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ password: hashedPassword })
        .eq("id", user.id);

      if (updateError) {
        console.error(`❌ Error updating ${user.email}:`, updateError);
      } else {
        console.log(`✅ Hashed password for ${user.email}`);
        updated++;
      }
    }

    console.log(`\n📈 ${tableName} Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📊 Total: ${users.length}`);

  } catch (err) {
    console.error(`❌ Error processing ${tableName}:`, err);
  }
}

async function main() {
  console.log("🔐 Starting password hashing migration...\n");
  console.log("⚠️  WARNING: This will hash all plain-text passwords in the database");
  console.log("⚠️  Make sure you have a backup before proceeding!\n");

  // Hash passwords for all user tables
  await hashPasswordsForTable("buyers");
  await hashPasswordsForTable("sellers");
  await hashPasswordsForTable("drivers");

  console.log("\n✨ Password hashing migration completed!");
  console.log("🔒 All passwords are now securely hashed with bcrypt");
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });

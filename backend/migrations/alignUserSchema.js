const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function migrateUsers() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to database...');

    // Get all existing users
    const users = await User.find({});
    console.log(`Found ${users.length} users to migrate`);

    // Migrate each user
    for (const user of users) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            firstName: user.name || 'User', // Map old 'name' to new 'firstName'
            lastName: '', // Add empty lastName
            religion: 'hindu', // Default value
            caste: '', // Empty string
            education: 'bachelor', // Default value
            occupation: 'Not specified', // Default value
            // Update preferences structure
            preferences: {
              ...user.preferences,
              preferredReligions: user.preferences.preferredReligions || ['hindu']
            }
          },
          $unset: {
            name: 1 // Remove old 'name' field
          }
        }
      );
      console.log(`Migrated user ${user._id}`);
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateUsers();
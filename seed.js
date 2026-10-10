require('dotenv').config();
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const { ROLES } = require('./src/constants/roles');

async function seedDatabase() {
  try {
    await connectDB();

    console.log('\n--- Seeding Default CRM Users ---');

    const defaultUsers = [
      {
        name: 'System Administrator',
        email: 'admin@crm.local',
        password: 'Admin@123',
        role: ROLES.ADMIN,
        department: 'Executive Management',
        isActive: true,
      },
      {
        name: 'Sarah Sales Manager',
        email: 'manager@crm.local',
        password: 'Manager@123',
        role: ROLES.SALES_MANAGER,
        department: 'Enterprise Sales Ops',
        isActive: true,
      },
      {
        name: 'Alex Sales Executive',
        email: 'rep@crm.local',
        password: 'Executive@123',
        role: ROLES.SALES_EXECUTIVE,
        department: 'Inbound Sales',
        isActive: true,
      },
    ];

    for (const userData of defaultUsers) {
      const existing = await User.findOne({ email: userData.email.toLowerCase() });
      if (existing) {
        // Update password and ensure active status
        existing.name = userData.name;
        existing.password = userData.password;
        existing.role = userData.role;
        existing.department = userData.department;
        existing.isActive = true;
        await existing.save();
        console.log(`✓ Updated existing: ${userData.email} (${userData.role})`);
      } else {
        await User.create(userData);
        console.log(`✓ Created new:      ${userData.email} (${userData.role})`);
      }
    }

    console.log('\n======================================================');
    console.log(' CRM DEFAULT CREDENTIALS (READY TO USE)');
    console.log('======================================================');
    console.log(' 1. ADMIN USER');
    console.log('    Email:    admin@crm.local');
    console.log('    Password: Admin@123');
    console.log('    Role:     admin\n');
    console.log(' 2. SALES MANAGER USER');
    console.log('    Email:    manager@crm.local');
    console.log('    Password: Manager@123');
    console.log('    Role:     sales_manager\n');
    console.log(' 3. SALES EXECUTIVE USER');
    console.log('    Email:    rep@crm.local');
    console.log('    Password: Executive@123');
    console.log('    Role:     sales_executive');
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seedDatabase();

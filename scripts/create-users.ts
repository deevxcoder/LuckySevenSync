import { storage } from "../server/storage";

async function createUsers() {
  try {
    console.log("Creating users...");
    
    // Create admin user: kalia
    const existingAdmin = await storage.getUserByUsername("kalia");
    if (existingAdmin) {
      console.log("Admin user 'kalia' already exists");
    } else {
      const admin = await storage.createUser({
        username: "kalia",
        password: "asdf1234",
        role: "admin",
        status: "active"
      });
      console.log(`✓ Created admin user: ${admin.username} (ID: ${admin.id})`);
    }
    
    // Create normal user: test
    const existingUser = await storage.getUserByUsername("test");
    if (existingUser) {
      console.log("User 'test' already exists");
    } else {
      const user = await storage.createUser({
        username: "test",
        password: "asdf1234",
        role: "user",
        status: "active"
      });
      console.log(`✓ Created user: ${user.username} (ID: ${user.id})`);
    }
    
    // Create player records for both users
    const kaliaUser = await storage.getUserByUsername("kalia");
    const testUser = await storage.getUserByUsername("test");
    
    if (kaliaUser) {
      const kaliaPlayer = await storage.getPlayerByUserId(kaliaUser.id);
      if (!kaliaPlayer) {
        await storage.createPlayer({
          userId: kaliaUser.id,
          chips: 10000,
          gamesPlayed: 0,
          gamesWon: 0
        });
        console.log(`✓ Created player record for kalia`);
      }
    }
    
    if (testUser) {
      const testPlayer = await storage.getPlayerByUserId(testUser.id);
      if (!testPlayer) {
        await storage.createPlayer({
          userId: testUser.id,
          chips: 10000,
          gamesPlayed: 0,
          gamesWon: 0
        });
        console.log(`✓ Created player record for test`);
      }
    }
    
    console.log("\nUsers created successfully!");
    console.log("---");
    console.log("Admin: kalia / asdf1234");
    console.log("User: test / asdf1234");
    
    process.exit(0);
  } catch (error) {
    console.error("Error creating users:", error);
    process.exit(1);
  }
}

createUsers();

// Simple script to create users via HTTP requests to the running server
async function addUsers() {
  try {
    console.log("Creating users via development API...\n");
    
    // Create admin user 'kalia'
    try {
      const adminResponse = await fetch("http://localhost:5000/api/dev/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: "kalia", 
          password: "asdf1234",
          role: "admin"
        })
      });
      
      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        console.log("✅ Admin user created:", adminData.username, "with role:", adminData.role);
      } else {
        const error = await adminResponse.json();
        console.log("ℹ️  User 'kalia':", error.message);
      }
    } catch (error) {
      console.error("❌ Error creating admin user 'kalia':", error);
    }

    // Create regular user 'test'
    try {
      const testResponse = await fetch("http://localhost:5000/api/dev/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: "test", 
          password: "asdf1234",
          role: "user"
        })
      });
      
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log("✅ Test user created:", testData.username, "with role:", testData.role);
      } else {
        const error = await testResponse.json();
        console.log("ℹ️  User 'test':", error.message);
      }
    } catch (error) {
      console.error("❌ Error creating test user:", error);
    }

    console.log("\n✨ User creation complete!");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

addUsers();

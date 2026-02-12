const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors()); 
app.use(express.json()); 

// Render.com এর Environment Variable থেকে Firebase Key নেওয়া
if (!process.env.FIREBASE_CREDENTIALS) {
    console.error("Missing FIREBASE_CREDENTIALS environment variable!");
} else {
    const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // ⚠️ নিচে আপনার ফায়ারবেস ডাটাবেস URL দিন
      databaseURL: "https://roktobij-4210b-default-rtdb.firebaseio.com" 
    });
}

const db = admin.database();

// ==========================================
// 🚀 API Endpoint: রিওয়ার্ড + হিস্ট্রি সেভ করা
// ==========================================
app.post('/api/claim-reward', async (req, res) => {
    const { uid } = req.body;

    if (!uid) {
        return res.status(400).json({ success: false, message: "User ID missing!" });
    }

    try {
        // ১. ব্যালেন্স আপডেট করা
        const walletRef = db.ref(`users/${uid}/wallet/greenDiamondBalance`);
        await walletRef.transaction((currentBalance) => {
            return (currentBalance || 0) + 10;
        });

        // ২. হিস্ট্রি সেভ করা (নতুন অংশ) ✅
        const historyRef = db.ref(`walletHistory/${uid}`);
        await historyRef.push({
            amount: 10,
            type: "Credit",
            reason: "Game Reward",
            timestamp: admin.database.ServerValue.TIMESTAMP // সার্ভার টাইম
        });

        res.status(200).json({ success: true, message: "Reward added successfully" });
        console.log(`Success: 10 Diamonds & History added to UID: ${uid}`);

    } catch (error) {
        console.error("Firebase update error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// সার্ভার পোর্ট সেটআপ
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

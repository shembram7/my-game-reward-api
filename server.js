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
// 🚀 API Endpoint: রিওয়ার্ড + সঠিক ফরম্যাটে হিস্ট্রি সেভ করা
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

        // ২. হিস্ট্রি সেভ করা (অ্যাপের Spin/Scratch Win এর ফরম্যাটে) ✅
        const historyRef = db.ref(`walletHistory/${uid}`);
        
        // প্রথমে একটি নতুন key তৈরি করি (যাতে id ফিল্ডে বসাতে পারি)
        const newHistoryRef = historyRef.push();
        
        await newHistoryRef.set({
            amount: 10,
            id: newHistoryRef.key,       // অ্যাপের লজিক অনুযায়ী আইডি এখানেও থাকতে হবে
            method: "Telegram Game B2E Diamond Zone Win",     // এটি অ্যাপের সাবটাইটেলে দেখাবে (Spin Win এর জায়গায়)
            status: "approved",          // অ্যাপের স্ট্যাটাস গ্রিন করার জন্য
            timestamp: admin.database.ServerValue.TIMESTAMP,
            transactionId: "",           // অ্যাপের ফরম্যাট অনুযায়ী খালি স্ট্রিং
            type: "Reward",              // ⚠️ এটি সবচেয়ে জরুরি! "Reward" দিলেই কেবল সবুজ দেখাবে
            userId: uid
        });

        res.status(200).json({ success: true, message: "Reward added successfully" });
        console.log(`Success: 10 Diamonds added to UID: ${uid}`);

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

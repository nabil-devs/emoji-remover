// Test the regex pattern - Run your test here
const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{1F300}-\u{1F5FF}]/gu;
// 😭
const testString = "Hello ❤️ World 😄 Test 💎";
const result = testString.replace(emojiRegex, '');
// 🛷TEXT📄
//TEXT🏢 
console.log("Original:", testString);
console.log("Cleaned:", result);  
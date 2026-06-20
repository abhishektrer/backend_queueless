import Groq from 'groq-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧪 Testing Groq AI Connection...\n');

const apiKey = process.env.GROQ_API_KEY;
const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}` : '❌ NOT FOUND');
console.log('Model:', model);
console.log('');

if (!apiKey || apiKey === 'your_groq_api_key_here') {
  console.error('❌ ERROR: Groq API key not configured!');
  console.log('\n📝 Please add your Groq API key to backend/.env:');
  console.log('   GROQ_API_KEY=gsk_your_actual_key_here\n');
  process.exit(1);
}

const groq = new Groq({ apiKey });

async function testGroq() {
  try {
    console.log('🚀 Sending test request to Groq...\n');
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant.'
        },
        {
          role: 'user',
          content: 'Say "Hello! Groq AI is working perfectly!" in a friendly way.'
        }
      ],
      model: model,
      temperature: 0.7,
      max_tokens: 100,
    });

    const response = chatCompletion.choices[0]?.message?.content;

    console.log('✅ SUCCESS! Groq AI is working!\n');
    console.log('📝 Response:');
    console.log('─'.repeat(60));
    console.log(response);
    console.log('─'.repeat(60));
    console.log('\n🎉 Your Groq integration is ready to use!');
    console.log('📊 Model used:', chatCompletion.model);
    console.log('⏱️  Response time:', new Date().toISOString());
    
  } catch (error) {
    console.error('❌ ERROR: Groq API call failed!\n');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    if (error.error) {
      console.error('\nDetailed error:', JSON.stringify(error.error, null, 2));
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your API key is correct (starts with gsk_)');
    console.log('2. Verify your Groq account is active: https://console.groq.com/');
    console.log('3. Check you haven\'t exceeded rate limits');
    console.log('4. Try regenerating your API key if issue persists\n');
    
    process.exit(1);
  }
}

testGroq();

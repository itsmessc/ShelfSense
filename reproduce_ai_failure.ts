import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testModel(modelName: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set');
    return;
  }

  console.log(`Testing model: ${modelName}`);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const result = await model.generateContent("Say 'AI is working'");
    console.log(`Result for ${modelName}:`, result.response.text());
  } catch (error) {
    console.error(`Error for ${modelName}:`, error instanceof Error ? error.message : error);
  }
}

async function run() {
  await testModel('gemini-3-flash-preview');
  await testModel('gemini-1.5-flash');
}

run();

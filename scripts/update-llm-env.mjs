import fs from 'fs';

const files = ['.env', '.secrets/env.master', 'apps/api/.env.local', 'apps/web/.env.local'];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/^LLM_MODEL=.*$/m, 'LLM_MODEL=gemini-3.5-flash');
    content = content.replace(/^LLM_MODEL_FALLBACK=.*$/m, 'LLM_MODEL_FALLBACK=gemini-3.8-flash');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated LLM_MODEL in ${file}`);
  }
}

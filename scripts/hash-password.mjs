import { hashPassword } from '../src/core/auth.mjs';
const password=process.argv[2];
if(!password){console.error('Usage: npm run auth:hash -- "your-password"');process.exit(1);}
try{console.log(await hashPassword(password));}catch(error){console.error(error.message);process.exit(1);}

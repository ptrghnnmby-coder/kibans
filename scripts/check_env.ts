import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

console.log('Environment Config:')
console.log('SHEET_MASTER_ID:', process.env.SHEET_MASTER_ID)
console.log('SHEET_NOTES_ID:', process.env.SHEET_NOTES_ID)
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL)

from pathlib import Path
from dotenv import load_dotenv
import os
ROOT = Path(__file__).resolve().parent.parent
env_path = ROOT / '.env'
if not env_path.exists():
    env_path = ROOT / '.env.example'
print('loading', env_path)
load_dotenv(env_path)
print('SUPABASE_URL=', os.getenv('SUPABASE_URL'))
print('SUPABASE_ANON_KEY=', os.getenv('SUPABASE_ANON_KEY'))
print('DATABASE_URL=', os.getenv('DATABASE_URL'))


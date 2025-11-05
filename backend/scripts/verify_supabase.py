"""scripts/verify_supabase.py

- Loads .env (or .env.example) for SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE
- Uses supabase-py to query `accounts_business` and `accounts_user` tables to verify data.
- Optionally runs the local Django registration flow via HTTP (if server is running locally) to create a demo user, then re-queries Supabase to verify the new row.

Usage (from project root):
    pip install -r requirements.txt
    python scripts\verify_supabase.py

Environment:
  - SUPABASE_URL (required)
  - SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE (at least one required)
  - If you want the script to POST to the local API, set LOCAL_SERVER (e.g. http://127.0.0.1:8000)

Security: for inserts/reads that require elevated privileges, set SUPABASE_SERVICE_ROLE in your .env. Do NOT commit this key.
"""

import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
except Exception:
    print('python-dotenv not installed. Please run: pip install python-dotenv')
    raise

try:
    from supabase import create_client
except Exception:
    print('supabase package not installed. Please run: pip install supabase')
    raise

import json
import requests
from time import sleep

ROOT = Path(__file__).resolve().parent.parent
# Load .env if present, else attempt .env.example
env_path = ROOT / '.env'
if not env_path.exists():
    env_path = ROOT / '.env.example'

try:
    print(f'Loading env from {env_path}', flush=True)
    load_dotenv(env_path)

    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
    SUPABASE_SERVICE_ROLE = os.getenv('SUPABASE_SERVICE_ROLE')
    LOCAL_SERVER = os.getenv('LOCAL_SERVER', 'http://127.0.0.1:8000')

    if not SUPABASE_URL:
        print('SUPABASE_URL is required in .env or .env.example', flush=True)
        sys.exit(1)

    # Prefer service role if available for full access
    KEY = SUPABASE_SERVICE_ROLE or SUPABASE_ANON_KEY
    if not KEY:
        print('Please set SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE in .env to proceed', flush=True)
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, KEY)

    print('Querying accounts_business (first 10 rows)', flush=True)
    try:
        res = supabase.table('accounts_business').select('*').limit(10).execute()
        print('status', getattr(res, 'status_code', None), flush=True)
        try:
            print(json.dumps(res.data, default=str, indent=2), flush=True)
        except Exception:
            print(res, flush=True)
    except Exception as e:
        # Provide a clearer hint when the table isn't found in PostgREST
        msg = str(e)
        print('Error querying accounts_business:', msg, flush=True)
        if "Could not find the table" in msg or 'PGRST205' in msg:
            print('\nIt looks like the table `accounts_business` does not exist in your Supabase database (PostgREST error PGRST205).', flush=True)
            print('This usually means Django migrations have not been run against that database. To create the tables, either:', flush=True)
            print('  - Set DATABASE_URL in your .env to your Supabase Postgres connection string and run:', flush=True)
            print('      python manage.py migrate', flush=True)
            print('    (You may need to stop or re-run the script after migrations complete.)', flush=True)
            print('  - Or run migrations directly by setting the DATABASE_URL env var for the command:', flush=True)
            print('      set DATABASE_URL=postgres://user:pass@host:5432/dbname && python manage.py migrate', flush=True)
        # Continue to attempt the next query; don't crash here

    print('\nQuerying accounts_user (first 10 rows)', flush=True)
    try:
        res = supabase.table('accounts_user').select('*').limit(10).execute()
        print('status', getattr(res, 'status_code', None), flush=True)
        try:
            print(json.dumps(res.data, default=str, indent=2), flush=True)
        except Exception:
            print(res, flush=True)
    except Exception as e:
        msg = str(e)
        print('Error querying accounts_user:', msg, flush=True)
        if "Could not find the table" in msg or 'PGRST205' in msg:
            print('\nIt looks like the table `accounts_user` does not exist in your Supabase database (PostgREST error PGRST205).', flush=True)
            print('Run Django migrations against the Supabase Postgres to create the tables:', flush=True)
            print('  set DATABASE_URL=postgres://user:pass@host:5432/dbname && python manage.py migrate', flush=True)

    # If service role is present, we can attempt to verify after hitting the Django API
    if SUPABASE_SERVICE_ROLE:
        print('\nService role key detected: will attempt to POST a demo registration via local Django API and then re-query Supabase to confirm', flush=True)
        payload = { 'email': 'demo+supabase@example.com', 'password': 'Password123!', 'first_name': 'DemoSup', 'business_name': 'Demo Supabase Shop', 'business_type': 'retail' }
        try:
            r = requests.post(f'{LOCAL_SERVER}/api/auth/register', json=payload, timeout=10)
            print('register', r.status_code, r.text[:1000], flush=True)
        except Exception as e:
            print('Failed to POST to local server:', e, flush=True)
            print('If your Django server is not running locally, start it with: python manage.py runserver', flush=True)
            sys.exit(1)

        # Wait a moment for DB to reflect
        sleep(1)
        print('Re-querying accounts_user for the demo email', flush=True)
        res = supabase.table('accounts_user').select('*').eq('email', payload['email']).execute()
        print('status', getattr(res, 'status_code', None), flush=True)
        print(res.data, flush=True)

        print('Re-querying accounts_business for the demo business name', flush=True)
        res = supabase.table('accounts_business').select('*').eq('name', payload['business_name']).execute()
        print('status', getattr(res, 'status_code', None), flush=True)
        print(res.data, flush=True)

    print('\nDone', flush=True)

except Exception as exc:
    print('Uncaught exception in verify_supabase.py:', exc, flush=True)
    import traceback
    traceback.print_exc()
    sys.exit(2)

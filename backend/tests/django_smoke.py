"""Python smoke test for SmartMarket Django API
Usage: python tests/django_smoke.py
Requires: requests (pip install requests)

Targets: /api/auth/register, /api/auth/login, /api/auth/token/refresh, /api/business/profile
"""
import requests
import time
import sys

BASE = "http://127.0.0.1:8000/api"


def now_email():
    return f"smoke+{int(time.time() * 1000)}@example.com"


def main():
    email = now_email()
    password = 'password123'
    payload = {
        'email': email,
        'password': password,
        'first_name': 'Smoke',
        'business_name': 'Smoke Shop',
        'business_type': 'retail',
        'language': 'en'
    }

    print('Running Python smoke test against', BASE)

    # register
    r = requests.post(BASE + '/auth/register', json=payload)
    print('register', r.status_code, r.text)
    if r.status_code not in (201, 409):
        print('Register failed')
        return sys.exit(1)

    # login
    r = requests.post(BASE + '/auth/login', json={'email': email, 'password': password})
    print('login', r.status_code, r.text)
    if r.status_code != 200:
        print('Login failed')
        return sys.exit(1)
    tokens = r.json()
    access = tokens.get('access_token')
    refresh = tokens.get('refresh_token')
    if not access or not refresh:
        print('Missing tokens')
        return sys.exit(1)

    # profile
    headers = {'Authorization': f'Bearer {access}'}
    r = requests.get(BASE + '/business/profile', headers=headers)
    print('profile', r.status_code, r.text)
    if r.status_code != 200:
        print('Profile failed')
        return sys.exit(1)

    # refresh
    r = requests.post(BASE + '/auth/token/refresh', json={'refresh_token': refresh})
    print('refresh', r.status_code, r.text)
    if r.status_code != 200:
        print('Token refresh failed')
        return sys.exit(1)

    print('Python smoke test complete: ALL OK')
    return sys.exit(0)


if __name__ == '__main__':
    main()


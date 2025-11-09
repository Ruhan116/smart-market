"""
Generate a secure Django SECRET_KEY for production deployment.
Run this script and copy the output to your environment variables.
"""

from django.core.management.utils import get_random_secret_key

if __name__ == "__main__":
    secret_key = get_random_secret_key()
    print("\n" + "="*60)
    print("🔐 DJANGO SECRET KEY GENERATOR")
    print("="*60)
    print("\nYour new SECRET_KEY:")
    print(f"\n{secret_key}\n")
    print("="*60)
    print("\n✅ Copy this key and add it to your deployment environment variables:")
    print("   DJANGO_SECRET_KEY=<paste-key-here>")
    print("\n⚠️  Keep this secret! Never commit it to version control.")
    print("="*60 + "\n")

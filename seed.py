"""Compatibility entrypoint for the demo data in backend/."""
from backend.seed import seed


if __name__ == "__main__":
    seed()

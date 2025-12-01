"""
Database migration script to recreate tables with new schema.
Run this script to update your database schema.
"""
from database import Base, engine
import os

def migrate_database():
    """Drop all tables and recreate them with the new schema"""
    print("Dropping all existing tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating new tables with updated schema...")
    Base.metadata.create_all(bind=engine)
    
    print("✅ Database migration completed successfully!")
    print("   - Users table created")
    print("   - ChatMessages table updated with user_id")
    print("   - GraphNodes table created")
    print("   - GraphEdges table created")

if __name__ == "__main__":
    # Check if database file exists
    db_path = "trustaudit.db"
    if os.path.exists(db_path):
        response = input(f"⚠️  This will delete all existing data in {db_path}. Continue? (yes/no): ")
        if response.lower() != "yes":
            print("Migration cancelled.")
            exit(0)
    
    migrate_database()


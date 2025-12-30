# Timetable Scheduler - Backend

FastAPI backend for the Timetable Scheduler application.

## Features

- **Multi-tenant architecture**: Support for multiple schools
- **Flexible data model**: Extensible with JSONB fields
- **Multiple scheduling algorithms**: Greedy, Backtracking, Genetic, Simulated Annealing
- **Constraint management**: Hard and soft constraints
- **Async operations**: Full async support with PostgreSQL

## Tech Stack

- **Framework**: FastAPI 0.109+
- **Database**: PostgreSQL 14+ with asyncpg
- **ORM**: SQLAlchemy 2.0+
- **Authentication**: JWT with python-jose
- **Validation**: Pydantic v2
- **Scheduling**: NumPy, SciPy, DEAP, OR-Tools

## Setup

### 1. Install PostgreSQL

Make sure PostgreSQL 14+ is installed and running.

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE timetable_db;
CREATE USER timetable_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE timetable_db TO timetable_user;
```

### 3. Initialize Schema

```bash
# Run schema creation
psql -U timetable_user -d timetable_db -f ../database_schema.sql

# Load sample data (optional)
psql -U timetable_user -d timetable_db -f ../sample_data.sql
```

### 4. Install Python Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 5. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings
```

Example `.env`:
```
DATABASE_URL=postgresql://timetable_user:your_password@localhost:5432/timetable_db
DATABASE_ASYNC_URL=postgresql+asyncpg://timetable_user:your_password@localhost:5432/timetable_db
SECRET_KEY=your-secret-key-change-this
DEBUG=True
```

### 6. Run the Server

```bash
# Development mode (with auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using Python
python -m app.main
```

The API will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Schools
- `GET /api/v1/schools` - List all schools
- `GET /api/v1/schools/{id}` - Get school details
- `POST /api/v1/schools` - Create school

### Teachers
- `GET /api/v1/teachers?school_id={id}` - List teachers
- `GET /api/v1/teachers/{id}` - Get teacher details
- `POST /api/v1/teachers` - Create teacher

### Classes
- `GET /api/v1/classes?school_id={id}` - List classes
- `POST /api/v1/classes` - Create class

### Subjects
- `GET /api/v1/subjects?school_id={id}` - List subjects
- `POST /api/v1/subjects` - Create subject

### Rooms
- `GET /api/v1/rooms?school_id={id}` - List rooms
- `POST /api/v1/rooms` - Create room

### Time Slots
- `GET /api/v1/time-slots?school_id={id}` - List time slots
- `POST /api/v1/time-slots` - Create time slot

### Lessons
- `GET /api/v1/lessons?school_id={id}` - List lessons
- `POST /api/v1/lessons` - Create lesson

## Database Schema

The database is designed for extensibility:

- **JSONB fields**: Flexible metadata storage
- **Proper indexing**: Optimized queries
- **Foreign keys**: Data integrity
- **Enums**: Type safety
- **Audit log**: Change tracking
- **Constraints**: Hard and soft constraint support

## Next Steps

1. ✅ Database schema created
2. ✅ Backend models and routes created
3. ⏳ Implement authentication
4. ⏳ Implement scheduling algorithms
5. ⏳ Add WebSocket support for real-time progress
6. ⏳ Create frontend application
7. ⏳ Add i18n support (English/Russian)

## Testing

Sample data is provided in `sample_data.sql`. After loading it:

- **School**: Atatürk Science High School
- **Admin credentials**: admin@ashs.edu.tr / admin123
- **6 classes**: 9A, 9B, 10A, 10B, 11-SCI, 12-SCI
- **14 teachers**: Various subjects
- **11 subjects**: Math, Physics, Chemistry, Biology, etc.
- **12 rooms**: Classrooms, labs, gym, etc.
- **40 time slots**: Monday-Friday, 8 periods/day

## Development

```bash
# Run tests
pytest

# Format code
black app/

# Type checking
mypy app/
```

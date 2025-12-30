# Timetable Scheduler

**Advanced school timetable scheduling system with multiple algorithm support**

A modern, web-based timetable scheduling application designed for schools and colleges. Supports multiple scheduling algorithms, complex constraints, and flexible configurations.

## 🌟 Features

### Core Features
- **Multi-tenant**: Support for multiple schools/institutions
- **Multiple Algorithms**: Greedy, Backtracking, Genetic Algorithm, Simulated Annealing
- **Smart Constraints**: Hard constraints (must satisfy) and soft constraints (optimize)
- **Split Groups**: Divide classes for labs, language groups, etc.
- **Free Days**: Allow teachers to have full free days
- **Morning Preference**: Prioritize difficult subjects in morning slots
- **Room Management**: Different room types (classroom, lab, gym, etc.)
- **Real-time Generation**: WebSocket support for live progress updates

### Data Management
- Teachers with workload limits and availability
- Classes/Groups with student counts
- Subjects with difficulty levels and requirements
- Rooms with capacity and type
- Time slots with flexible scheduling
- Custom constraints

### Scheduling Features
- Avoid teacher conflicts (no double-booking)
- Avoid class conflicts
- Room allocation based on requirements
- Respect teacher unavailability
- Minimize gaps in schedules
- Balance daily workload
- Consecutive periods for labs
- Manual override capability

## 🏗️ Architecture

```
timetables/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── models/            # SQLAlchemy models
│   │   │   ├── school.py
│   │   │   ├── teacher.py
│   │   │   ├── class_model.py
│   │   │   ├── subject.py
│   │   │   ├── room.py
│   │   │   ├── time_slot.py
│   │   │   ├── lesson.py
│   │   │   └── timetable.py
│   │   ├── routes/            # API endpoints
│   │   │   ├── schools.py
│   │   │   ├── teachers.py
│   │   │   ├── classes.py
│   │   │   ├── subjects.py
│   │   │   ├── rooms.py
│   │   │   ├── time_slots.py
│   │   │   └── lessons.py
│   │   ├── config.py          # Configuration
│   │   ├── database.py        # DB connection
│   │   └── main.py            # App entry point
│   ├── .env                   # Environment variables
│   └── requirements.txt       # Python dependencies
│
├── frontend/                   # React frontend ✅
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/        # Layout components
│   │   │   ├── common/        # Reusable components
│   │   │   └── timetable/     # Timetable components
│   │   ├── pages/             # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Schools.tsx
│   │   │   ├── Teachers.tsx
│   │   │   ├── Classes.tsx
│   │   │   ├── Subjects.tsx
│   │   │   ├── Rooms.tsx
│   │   │   ├── TimeSlots.tsx
│   │   │   ├── Lessons.tsx
│   │   │   └── Timetables.tsx
│   │   ├── lib/               # API & services
│   │   ├── types/             # TypeScript types
│   │   ├── App.tsx            # Router config
│   │   └── main.tsx           # Entry point
│   ├── package.json
│   └── tailwind.config.js
│
├── database_schema.sql         # PostgreSQL schema
├── sample_data.sql            # Sample school data
├── setup_database.bat         # Windows setup
├── setup_database.sh          # Linux/Mac setup
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites

- **PostgreSQL 14+**: [Download](https://www.postgresql.org/download/)
- **Python 3.11+**: [Download](https://www.python.org/downloads/)
- **Node.js 18+** (for frontend): [Download](https://nodejs.org/)

### 1. Database Setup

**Windows:**
```bash
setup_database.bat
```

**Linux/Mac:**
```bash
chmod +x setup_database.sh
./setup_database.sh
```

This will:
- Create `timetable_db` database
- Create `timetable_user` with password
- Initialize schema with tables, views, triggers
- Optionally load sample data

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run server
uvicorn app.main:app --reload
```

Backend will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at http://localhost:5173

## 📊 Database Schema

Designed for extensibility and scalability:

### Core Tables
- `schools` - Multi-tenant support
- `users` - Authentication & authorization
- `teachers` - Teacher information and constraints
- `classes` - Student groups
- `subjects` - Subject definitions
- `rooms` - Physical locations
- `time_slots` - Schedule periods
- `lessons` - Curriculum requirements

### Scheduling Tables
- `timetables` - Generated schedules
- `timetable_entries` - Scheduled lessons
- `constraint_violations` - Violation tracking
- `lesson_groups` - Split class support

### Constraint Tables
- `teacher_unavailability` - Teacher time restrictions
- `room_unavailability` - Room availability
- `soft_preferences` - Weighted preferences
- `custom_constraints` - Extensible constraints

### Features
- **JSONB fields**: Flexible metadata storage
- **Enums**: Type safety for status, roles, etc.
- **Views**: Pre-computed queries for common operations
- **Triggers**: Auto-update timestamps
- **Indexes**: Optimized performance
- **Audit log**: Change tracking

## 🎯 Scheduling Algorithms

### 1. Greedy Algorithm (Fast, Simple)
- Sequential placement
- Best available slot selection
- Good for simple schedules
- ~O(n²) complexity

### 2. Backtracking (Classic CSP)
- Depth-first search with constraint checking
- Arc consistency (AC-3)
- Guaranteed solution if exists
- Good for small-medium schools

### 3. Genetic Algorithm (Advanced)
- Population-based optimization
- Mutation and crossover operators
- Escapes local minima
- Best for complex constraints

### 4. Simulated Annealing (Balanced)
- Temperature-based optimization
- Accepts worse solutions probabilistically
- Fast convergence
- Good balance of speed and quality

## 🔧 API Endpoints

### Schools
```
GET    /api/v1/schools           # List schools
GET    /api/v1/schools/{id}      # Get school
POST   /api/v1/schools           # Create school
```

### Teachers
```
GET    /api/v1/teachers?school_id={id}    # List teachers
GET    /api/v1/teachers/{id}              # Get teacher
POST   /api/v1/teachers                   # Create teacher
```

### Classes, Subjects, Rooms, Time Slots, Lessons
Similar CRUD operations for each resource.

### Timetables (Coming Soon)
```
POST   /api/v1/timetables/generate        # Generate timetable
GET    /api/v1/timetables/{id}            # Get timetable
WS     /ws/timetables/{id}                # Real-time progress
```

## 📚 Sample Data

After running setup with sample data, you get:

- **School**: Atatürk Science High School
- **Login**: admin@ashs.edu.tr / admin123
- **6 Classes**: 9A, 9B, 10A, 10B, 11-SCI, 12-SCI
- **14 Teachers**: Math, Physics, Chemistry, Biology, English, etc.
- **11 Subjects**: Full curriculum
- **12 Rooms**: Classrooms, labs, gym, art, music
- **40 Time Slots**: Monday-Friday, 8 periods/day

## 🌍 Internationalization

- **Primary Language**: English (all code, variables, comments)
- **UI Languages**: English, Russian (coming soon)
- **i18n Framework**: i18next
- **Timezone Support**: Full timezone handling

## 🔜 Roadmap

### Phase 1: Foundation ✅ (Completed)
- [x] Database schema design
- [x] FastAPI backend structure
- [x] Basic CRUD operations
- [x] Sample data
- [x] **React application setup**
- [x] **All data entry forms (Schools, Teachers, Classes, Subjects, Rooms, Time Slots, Lessons)**
- [x] **Modal dialogs for CRUD operations**
- [x] **Dashboard with statistics**
- [x] **Timetable management page**

### Phase 2: Core Engine (Next)
- [ ] Constraint validation system
- [ ] Greedy algorithm implementation
- [ ] Backtracking algorithm
- [ ] Conflict detection
- [ ] Timetable generation API

### Phase 3: Advanced Algorithms
- [ ] Genetic algorithm
- [ ] Simulated annealing
- [ ] Hybrid approach
- [ ] Algorithm comparison

### Phase 4: UI Enhancement
- [ ] Timetable grid visualization (basic structure ready)
- [ ] Drag-drop interface
- [ ] Real-time updates via WebSocket
- [ ] Export functionality

### Phase 5: Polish
- [ ] Authentication & authorization
- [ ] Export to PDF/Excel
- [ ] Manual adjustments
- [ ] Russian translation
- [ ] Performance optimization

## 🛠️ Tech Stack

**Backend:**
- FastAPI - Modern Python web framework
- PostgreSQL - Robust relational database
- SQLAlchemy - ORM with async support
- Pydantic - Data validation
- NumPy/SciPy - Numerical computing
- DEAP - Genetic algorithms
- OR-Tools - Constraint optimization

**Frontend:**
- React 18 - Modern UI framework
- TypeScript - Type-safe development
- Vite - Fast build tool
- Tailwind CSS - Utility-first styling
- React Router - Client-side routing
- Axios - HTTP client with interceptors
- Lucide React - Beautiful icons
- Zustand - Lightweight state management
- React Query - Server state management

**DevOps:**
- Docker - Containerization
- Redis - Caching & queue
- Celery - Task queue

## 📝 License

MIT License - See LICENSE file

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

## 📧 Contact

For questions or feedback, please open an issue.

---

**Built with ❤️ for educators and schools worldwide**

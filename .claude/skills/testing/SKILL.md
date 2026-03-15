---
name: testing
description: "Testing and quality assurance skill. Use when writing unit tests, integration tests, API endpoint tests, React component tests, or when asked to verify, validate, or test any feature. Triggers on: test, testing, unit test, integration test, API test, coverage, jest, verify, validate, QA, quality, bug, regression."
---

# Testing & Quality Assurance Skill

## Testing Stack

This project uses:
- **Jest** (via CRA) — test runner and assertions
- **React Testing Library** — component testing
- **Supertest** (install when needed) — API endpoint testing

## What to Test

### Priority 1: Backend API Endpoints (Most Critical)
The PM dashboard is a data-driven tool. If the API is wrong, everything is wrong.

```javascript
// server/__tests__/pm-routes.test.js

const request = require('supertest');
const app = require('../server'); // export app from server.js

describe('PM API', () => {
  let pmToken;

  // Get a PM token before all tests
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/pm/auth/login')
      .send({ password: 'test_password' });
    pmToken = res.body.token;
  });

  describe('Team CRUD', () => {
    let memberId;

    test('POST /api/pm/team — create member', async () => {
      const res = await request(app)
        .post('/api/pm/team')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ name: 'Sarah Chen', role: 'frontend', email: 'sarah@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.member.name).toBe('Sarah Chen');
      memberId = res.body.member.id;
    });

    test('GET /api/pm/team — list members', async () => {
      const res = await request(app)
        .get('/api/pm/team')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.members.length).toBeGreaterThan(0);
    });

    test('PUT /api/pm/team/:id — update member', async () => {
      const res = await request(app)
        .put(`/api/pm/team/${memberId}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ role: 'fullstack' });

      expect(res.status).toBe(200);
      expect(res.body.member.role).toBe('fullstack');
    });

    test('DELETE /api/pm/team/:id — soft delete', async () => {
      const res = await request(app)
        .delete(`/api/pm/team/${memberId}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Task CRUD', () => {
    let taskId;

    test('POST /api/pm/tasks — create task', async () => {
      const res = await request(app)
        .post('/api/pm/tasks')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          title: 'Build auth flow',
          priority: 'HIGH',
          status: 'BACKLOG',
        });

      expect(res.status).toBe(200);
      expect(res.body.task.title).toBe('Build auth flow');
      taskId = res.body.task.id;
    });

    test('PATCH /api/pm/tasks/:id/move — move to IN_PROGRESS', async () => {
      const res = await request(app)
        .patch(`/api/pm/tasks/${taskId}/move`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.task.status).toBe('IN_PROGRESS');
      expect(res.body.task.started_at).toBeTruthy();
    });

    test('PATCH /api/pm/tasks/:id/move — move to DONE sets completed_at', async () => {
      const res = await request(app)
        .patch(`/api/pm/tasks/${taskId}/move`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ status: 'DONE' });

      expect(res.status).toBe(200);
      expect(res.body.task.completed_at).toBeTruthy();
    });

    test('PATCH /api/pm/tasks/:id/move — invalid status rejected', async () => {
      const res = await request(app)
        .patch(`/api/pm/tasks/${taskId}/move`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ status: 'INVALID' });

      expect(res.status).toBe(400);
    });
  });

  describe('Access Control', () => {
    test('No token → 404', async () => {
      const res = await request(app).get('/api/pm/team');
      expect(res.status).toBe(404);
    });

    test('Bad token → 404', async () => {
      const res = await request(app)
        .get('/api/pm/team')
        .set('Authorization', 'Bearer fake_token_here');
      expect(res.status).toBe(404);
    });

    test('Wrong password → 401', async () => {
      const res = await request(app)
        .post('/api/pm/auth/login')
        .send({ password: 'wrong_password' });
      expect(res.status).toBe(401);
    });
  });
});
```

### Priority 2: React Components

```typescript
// src/pages/pm/__tests__/StatusBadge.test.tsx
import { render, screen } from '@testing-library/react';
import StatusBadge from '../components/StatusBadge';

describe('StatusBadge', () => {
  test('renders BACKLOG status', () => {
    render(<StatusBadge status="BACKLOG" />);
    expect(screen.getByText('Backlog')).toBeInTheDocument();
  });

  test('renders IN_PROGRESS with accent color class', () => {
    const { container } = render(<StatusBadge status="IN_PROGRESS" />);
    expect(container.firstChild).toHaveClass('badge--in-progress');
  });

  test('renders DONE with success color class', () => {
    const { container } = render(<StatusBadge status="DONE" />);
    expect(container.firstChild).toHaveClass('badge--done');
  });
});
```

```typescript
// src/pages/pm/__tests__/TaskBoard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import TaskBoard from '../components/TaskBoard';

const mockTasks = [
  { id: 1, title: 'Build auth', status: 'BACKLOG', priority: 'HIGH', assignee_name: 'Sarah' },
  { id: 2, title: 'Design DB', status: 'IN_PROGRESS', priority: 'MEDIUM', assignee_name: 'Alex' },
];

describe('TaskBoard', () => {
  test('renders all 4 columns', () => {
    render(<TaskBoard tasks={mockTasks} onMoveTask={jest.fn()} onEditTask={jest.fn()} />);
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('In Review')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  test('places tasks in correct columns', () => {
    render(<TaskBoard tasks={mockTasks} onMoveTask={jest.fn()} onEditTask={jest.fn()} />);
    // Auth task should be in Backlog
    expect(screen.getByText('Build auth')).toBeInTheDocument();
    // DB task should be in In Progress
    expect(screen.getByText('Design DB')).toBeInTheDocument();
  });

  test('shows empty state when no tasks', () => {
    render(<TaskBoard tasks={[]} onMoveTask={jest.fn()} onEditTask={jest.fn()} />);
    expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
  });
});
```

### Priority 3: Integration Tests

```javascript
// Test the full flow: login → create team → create task → move task
describe('PM Dashboard Integration', () => {
  test('full workflow: login, add member, create task, move to done', async () => {
    // Login
    const loginRes = await request(app)
      .post('/api/pm/auth/login')
      .send({ password: 'test_password' });
    const token = loginRes.body.token;

    // Add member
    const memberRes = await request(app)
      .post('/api/pm/team')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test User', role: 'backend' });
    const memberId = memberRes.body.member.id;

    // Create task assigned to member
    const taskRes = await request(app)
      .post('/api/pm/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test task', assignee_id: memberId, priority: 'HIGH' });
    const taskId = taskRes.body.task.id;

    // Move through statuses
    await request(app)
      .patch(`/api/pm/tasks/${taskId}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'IN_PROGRESS' });

    await request(app)
      .patch(`/api/pm/tasks/${taskId}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'IN_REVIEW' });

    const doneRes = await request(app)
      .patch(`/api/pm/tasks/${taskId}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'DONE' });

    expect(doneRes.body.task.status).toBe('DONE');
    expect(doneRes.body.task.started_at).toBeTruthy();
    expect(doneRes.body.task.completed_at).toBeTruthy();
  });
});
```

## Test File Organization

```
server/
├── __tests__/
│   ├── pm-routes.test.js       — API endpoint tests
│   ├── pm-access.test.js       — Middleware tests
│   └── pm-integration.test.js  — Full workflow tests

src/pages/pm/
├── __tests__/
│   ├── PMDashboard.test.tsx    — Main page tests
│   ├── PMLogin.test.tsx        — Auth flow tests
│   ├── TaskBoard.test.tsx      — Kanban tests
│   ├── TeamOverview.test.tsx   — Team grid tests
│   ├── StatusBadge.test.tsx    — Badge rendering tests
│   └── AlertsPanel.test.tsx    — Alerts tests
```

## Running Tests

```bash
# Frontend tests (CRA's built-in Jest)
npm test

# Backend tests
cd server && npx jest

# With coverage
npm test -- --coverage
cd server && npx jest --coverage
```

## What NOT to Test

- Don't test CSS classes exist (brittle, breaks on refactors)
- Don't test third-party libraries (Slack API, GitHub API)
- Don't test implementation details (internal state shape)
- Don't write tests for static text that never changes

## Test Database

Use a separate in-memory SQLite database for tests:

```javascript
// server/__tests__/setup.js
const Database = require('better-sqlite3');

beforeAll(() => {
  process.env.DB_PATH = ':memory:';
  process.env.PM_PASSWORD_HASH = require('bcryptjs').hashSync('test_password', 10);
  process.env.PM_JWT_SECRET = 'test_secret';
  process.env.PM_ALLOWED_IPS = '127.0.0.1,::1,::ffff:127.0.0.1';
});
```

## Quality Checklist (Run Before Every Deploy)

1. All tests pass: `npm test && cd server && npx jest`
2. No TypeScript errors: `npx tsc --noEmit`
3. Build succeeds: `npm run build`
4. Manual smoke test: login → view team → create task → move task → check alerts
5. Check browser console for errors
6. Verify PM routes return 404 without auth
